"use client";
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { getFieldById } from '../lib/firebase';
import { getCachedAddressFromCoordinates } from '../lib/geocoding';
import { GoogleMap, useJsApiLoader, Polygon, Marker, InfoWindow } from '@react-google-maps/api';

interface FieldData {
  id: string;
  name: string;
  points: Array<{lat: number; lng: number}>;
  color: string;
  strokeColor: string;
  strokeWeight: number;
  fillOpacity: number;
  area: number;
  perimeter: number;
  [key: string]: any;
}

const containerStyle = {
  width: '100%',
  height: '70vh',
};

const libraries: any = ['places'];

const FieldMapPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fieldId = searchParams.get('id');
  
  const [field, setField] = useState<FieldData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [center, setCenter] = useState({ lat: 20, lng: 0 });
  const [address, setAddress] = useState<string>('Loading address...');
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [infoWindowPosition, setInfoWindowPosition] = useState<{lat: number, lng: number} | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries,
  });

  useEffect(() => {
    const fetchField = async () => {
      if (!fieldId) {
        setError('No field ID provided');
        setLoading(false);
        return;
      }

      try {
        const fieldData = await getFieldById(fieldId);
        if (!fieldData) {
          setError('Field not found');
          setLoading(false);
          return;
        }

        setField(fieldData);
        
        // Calculate center of field
        if (fieldData.points && fieldData.points.length > 0) {
          const sumLat = fieldData.points.reduce((sum, point) => sum + point.lat, 0);
          const sumLng = fieldData.points.reduce((sum, point) => sum + point.lng, 0);
          const avgLat = sumLat / fieldData.points.length;
          const avgLng = sumLng / fieldData.points.length;
          
          setCenter({ lat: avgLat, lng: avgLng });
          setInfoWindowPosition({ lat: avgLat, lng: avgLng });
          
          // Get address for the center point
          try {
            const addressResult = await getCachedAddressFromCoordinates(avgLat, avgLng);
            setAddress(addressResult);
          } catch (e) {
            console.error('Error getting address:', e);
            setAddress('Address not available');
          }
        }
        
        setLoading(false);
      } catch (err: any) {
        console.error('Error fetching field:', err);
        setError(`Error loading field: ${err.message || 'Unknown error'}`);
        setLoading(false);
      }
    };

    fetchField();
  }, [fieldId]);

  const goBack = () => {
    router.push('/admin');
  };

  if (!isLoaded) {
    return <div className="p-8 text-center">Loading Maps API...</div>;
  }

  return (
    <div className="min-h-screen bg-blue-50">
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <button 
              onClick={goBack} 
              className="mr-3 bg-blue-800 hover:bg-blue-900 p-2 rounded-full"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Field Map</h1>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <div className="mt-3">
              <button 
                onClick={goBack}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Return to admin dashboard
              </button>
            </div>
          </div>
        ) : field ? (
          <div>
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="px-4 py-5 sm:p-6">
                <h2 className="text-xl font-bold text-blue-900 mb-2">{field.name || "Unnamed Field"}</h2>
                <div className="text-sm text-gray-500 mb-4">
                  <div><span className="font-medium">ID:</span> {field.id}</div>
                  <div><span className="font-medium">Address:</span> {address}</div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div><span className="font-medium">Area:</span> {field.area?.toFixed(5) || "N/A"}</div>
                    <div><span className="font-medium">Perimeter:</span> {field.perimeter?.toFixed(5) || "N/A"}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={15}
                options={{
                  mapTypeId: 'satellite',
                  mapTypeControl: true,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {field.points && field.points.length > 0 && (
                  <Polygon
                    paths={field.points}
                    options={{
                      fillColor: field.color || '#00C853',
                      fillOpacity: field.fillOpacity || 0.3,
                      strokeColor: field.strokeColor || '#00C853',
                      strokeWeight: field.strokeWeight || 2,
                    }}
                  />
                )}
                
                {infoWindowPosition && (
                  <Marker
                    position={infoWindowPosition}
                    onClick={() => setShowInfoWindow(true)}
                  >
                    {showInfoWindow && (
                      <InfoWindow
                        position={infoWindowPosition}
                        onCloseClick={() => setShowInfoWindow(false)}
                      >
                        <div>
                          <h3 className="font-bold text-sm">{field.name}</h3>
                          <p className="text-xs">{address}</p>
                          <p className="text-xs">Area: {field.area?.toFixed(2)}</p>
                        </div>
                      </InfoWindow>
                    )}
                  </Marker>
                )}
              </GoogleMap>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <h3 className="text-lg font-medium text-blue-900 mb-4">Field Data</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Style</h4>
                    <dl className="grid grid-cols-3 gap-1 text-sm">
                      <dt className="col-span-1 text-gray-500">Color:</dt>
                      <dd className="col-span-2">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 mr-2 rounded-full border border-gray-300" 
                            style={{backgroundColor: field.color || '#FFFFFF'}}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{field.color || "N/A"}</code>
                        </div>
                      </dd>
                      
                      <dt className="col-span-1 text-gray-500">Stroke:</dt>
                      <dd className="col-span-2">
                        <div className="flex items-center">
                          <div 
                            className="w-4 h-4 mr-2 rounded-full border border-gray-300" 
                            style={{backgroundColor: field.strokeColor || '#FFFFFF'}}
                          ></div>
                          <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">{field.strokeColor || "N/A"}</code>
                        </div>
                      </dd>
                      
                      <dt className="col-span-1 text-gray-500">Stroke Weight:</dt>
                      <dd className="col-span-2">{field.strokeWeight || "N/A"}</dd>
                      
                      <dt className="col-span-1 text-gray-500">Fill Opacity:</dt>
                      <dd className="col-span-2">{field.fillOpacity || "N/A"}</dd>
                    </dl>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-blue-800 mb-2">Points</h4>
                    {field.points && field.points.length > 0 ? (
                      <div className="bg-gray-50 p-2 rounded-md border border-gray-200 max-h-48 overflow-y-auto">
                        <table className="text-xs w-full">
                          <thead>
                            <tr className="border-b border-gray-200">
                              <th className="py-1 text-left font-medium text-gray-500">Point</th>
                              <th className="py-1 text-left font-medium text-gray-500">Latitude</th>
                              <th className="py-1 text-left font-medium text-gray-500">Longitude</th>
                            </tr>
                          </thead>
                          <tbody>
                            {field.points.map((point, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="py-1 font-medium">{idx}</td>
                                <td className="py-1 font-mono">{point.lat.toFixed(8)}</td>
                                <td className="py-1 font-mono">{point.lng.toFixed(8)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500 italic">No coordinates data</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 p-4 rounded-md">
            No field data available.
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldMapPage; 