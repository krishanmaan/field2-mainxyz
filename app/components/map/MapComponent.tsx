'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef, createContext } from 'react';
import { GoogleMap, LoadScript, Marker, Circle, DrawingManager, Polygon } from '@react-google-maps/api';
import Navbar from './Navbar';
import MapControls from './MapControls';
import CreateMenu from './CreateMenu';
import ZoomControls from './ZoomControls';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { throttle, debounce } from '../../utils/debounce';
import { 
  faDrawPolygon, 
  faTrash, 
  faTimes, 
  faCog, 
  faPlus, 
  faEdit,
  faLocationDot,
  faRuler,
  faFileImport,
  faUndo,
  faRedo,
  faCheck,
  faPalette, 
  faFill, 
  faBorderStyle,
  faTag,
  faImage,
  faInfoCircle,
  faBrush, 
  faArrowsAlt,
  faPencilAlt,
  faPen,
  faEllipsisV,
  faObjectGroup,
  faObjectUngroup,
  faFileAlt
} from '@fortawesome/free-solid-svg-icons';
import SearchBox from './SearchBox';
import PolygonToolsMenu from './PolygonToolsMenu';
import { useAuth } from '@/app/context/AuthContext';
import { saveField, getUserFields, deleteField, checkFirestorePermissions, getUserDistanceMeasurements, deleteDistanceMeasurement } from '../../lib/firebase';
import { polygonToFieldData, fieldDataToPolygon, centerMapOnField } from '../../lib/mapUtils';
import { v4 as uuidv4 } from 'uuid';
import { uploadFieldImage, deleteFieldImage, getFieldImageUrl } from '@/app/lib/storage';
import DistanceMeasurement from './DistanceMeasurement';
import MarkerComponent from './MarkerComponent';
import { collection, getAggregateFromServer, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { MarkerData, Field } from './types';
import FieldImageGallery from './FieldImageGallery';
import FieldDetailsForm from './FieldDetailsForm';
import { saveFieldOwnerDetails, getFieldOwnerDetails } from '../../lib/firebase';
import { FieldFormData } from './FieldDetailsForm';
import { useJsApiLoader } from '@react-google-maps/api';
import { useMapLogic } from './hooks/useMapLogic';

// Local utility function for className merging
function cn(...classNames: (string | undefined)[]) {
  return classNames.filter(Boolean).join(' ');
}

type MapType = 'hybrid' | 'satellite' | 'roadmap' | 'terrain';

const libraries: ("places" | "drawing" | "geometry")[] = ["places", "drawing", "geometry"];

const polygonColor = '#00C853'; // Bright green color
const polygonFillOpacity = 0.1;
const strokeColor = '#00C853';
const strokeWeight = 1;

const LOCATION_MARKER_PATH = "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z";

const containerStyle = {
  width: '100%',
  height: '70vh',
};

const mapStyles = {
  container: {
    width: '100%',
    height: 'calc(100vh - 48px)',
    position: 'relative' as const
  },
  mapWithBanner: {
    width: '100%',
    height: 'calc(100vh - 96px)', // Account for both navbar and yellow banner (48px each)
    position: 'relative' as const
  },
  map: {
    width: '100%',
    height: '100%'
  }
};

const defaultCenter = {
  lat: 27.197777, 
  lng: 75.713098,
};

const mapOptions = {
  mapTypeControl: true,
  streetViewControl: false,
  fullscreenControl: true,
  zoomControl: false,
  mapTypeId: 'hybrid' as google.maps.MapTypeId,
};

const MARKER_ROTATION = 180; // Rotation in degrees

interface MapComponentProps {
  onAreaUpdate?: (newArea: number) => void;
  onPolygonUpdate?: (updatedPolygons: any[]) => void;
  className?: string;
}

// Add definition for FieldImage interface
interface FieldImages {
  [fieldIndex: number]: {
    images: string[]; // Array of base64 image strings
    mainImageIndex: number;
  }
}

// Update the PolygonToolsMenu props interface
interface PolygonToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onChangeStrokeColor: (color: string) => void;
  onChangeFillColor: (color: string) => void;
  onChangeStrokeWeight: (weight: number) => void;
  onChangeFillOpacity: (opacity: number) => void;
  onChangeName: (name: string) => void;
  onDelete: () => void;
  onToggleEditable?: () => void;
  onToggleDraggable?: () => void;
  strokeColor: string;
  fillColor: string;
  strokeWeight: number;
  fillOpacity: number;
  fieldName: string;
  fieldImages: string[];
  mainImageIndex: number;
  selectedPolygonIndex: number | null;
  isEditable?: boolean;
  isDraggable?: boolean;
}

export const MapContext = createContext<{
  openFieldById?: (fieldId: string) => void;
}>({});

const MapComponent = ({ children }: { children: React.ReactNode }) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  const mapRef = useRef<google.maps.Map | null>(null);
  const { state, setters } = useMapLogic();
  
  // Destructure necessary values from state and setters
  const { fields, mapType, selectedFieldId } = state;
  const { setFields, setSelectedFieldId } = setters;

  // Initialize map state (center and zoom)
  const [mapState, setMapState] = useState({
    center: defaultCenter,
    zoom: 10
  });

  // Function to open field by ID
  const openFieldById = useCallback((fieldId: string) => {
    // Find the field in the list
    const field = fields.find((f: Field) => f.id === fieldId);
    if (!field) {
      console.error(`Field with ID ${fieldId} not found`);
      return;
    }

    // Set the selected field
    setSelectedFieldId(field.id);

    // If the field has points, center the map on the field
    if (field.points && field.points.length > 0) {
      // Calculate bounds of the field
      const bounds = new google.maps.LatLngBounds();
      field.points.forEach((point: {lat: number, lng: number}) => {
        bounds.extend(new google.maps.LatLng(point.lat, point.lng));
      });

      // Center the map on the field and zoom to fit the bounds
      mapRef.current?.fitBounds(bounds, 50); // 50px padding
    }
  }, [fields, setSelectedFieldId]);

  // Handle map load
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  if (!isLoaded) return <div>Loading...</div>;

  return (
    <MapContext.Provider value={{ openFieldById }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={mapState.center}
        zoom={mapState.zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={mapOptions}
        onCenterChanged={() => {
          if (mapRef.current) {
            setMapState((prev: { center: {lat: number, lng: number}, zoom: number }) => ({
              ...prev,
              center: {
                lat: mapRef.current!.getCenter()!.lat(),
                lng: mapRef.current!.getCenter()!.lng()
              }
            }));
          }
        }}
        onZoomChanged={() => {
          if (mapRef.current) {
            setMapState((prev: { center: {lat: number, lng: number}, zoom: number }) => ({
              ...prev,
              zoom: mapRef.current!.getZoom() || prev.zoom
            }));
          }
        }}
      >
        {children}
      </GoogleMap>
    </MapContext.Provider>
  );
};

export default MapComponent;