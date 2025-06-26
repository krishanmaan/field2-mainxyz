"use client";
import React, { useEffect, useState } from "react";
import { fetchAllUsersWithFirestoreFields, auth, signInWithGoogle } from "../lib/firebase";

interface Field {
  id: string;
  name: string;
  area: number;
  perimeter: number;
  userId: string;
  [key: string]: any;
}

interface UserFields {
  uid: string;
  name: string;
  email: string;
  fields?: Record<string, Field>;
}

function getInitials(name: string | undefined) {
  if (!name) return "?";
  const parts = name.split(" ");
  if (parts.length === 1) return parts[0][0]?.toUpperCase() || "?";
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AdminPage = () => {
  const [users, setUsers] = useState<UserFields[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<"all" | "with-fields" | "no-fields">("all");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsAuthenticated(!!user);
      if (user) {
        fetchData();
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (err: any) {
      setError(`Login failed: ${err.message}`);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use the new function that fetches from Firestore
      const data = await fetchAllUsersWithFirestoreFields();
      const usersArr: UserFields[] = Object.entries(data).map(([uid, userData]: any) => ({
        uid,
        name: userData.name,
        email: userData.email,
        fields: userData.fields || {},
      }));
      setUsers(usersArr);
    } catch (error: any) {
      console.error("Error fetching user data:", error);
      setError(`Error loading data: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) => {
      const matchesSearch = user.name?.toLowerCase().includes(search.toLowerCase()) ||
        user.email?.toLowerCase().includes(search.toLowerCase());
      
      if (!matchesSearch) return false;
      
      if (selectedFilter === "with-fields") {
        return user.fields && Object.keys(user.fields).length > 0;
      }
      if (selectedFilter === "no-fields") {
        return !user.fields || Object.keys(user.fields).length === 0;
      }
      return true;
    }
  );

  const totalFields = users.reduce((acc, user) => {
    return acc + (user.fields ? Object.keys(user.fields).length : 0);
  }, 0);

  const toggleExpandUser = (uid: string) => {
    if (expandedUser === uid) {
      setExpandedUser(null);
    } else {
      setExpandedUser(uid);
    }
  };

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full">
          <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Admin Login Required</h1>
          <p className="text-gray-600 mb-6 text-center">You need to sign in with an admin account to access this page.</p>
          
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-md mb-6 text-sm">
              {error}
            </div>
          )}
          
          <button
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md flex items-center justify-center space-x-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" fill="#FFF"/>
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <header className="bg-blue-700 text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
            <div className="mt-3">
              <button 
                onClick={fetchData}
                className="text-sm font-medium text-red-600 hover:text-red-800"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          <div className="bg-white overflow-hidden shadow rounded-lg border border-blue-100">
            <div className="px-4 py-5 sm:p-6">
              <dl>
                <dt className="text-sm font-medium text-blue-600 truncate">Total Users</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-900">{users.length}</dd>
              </dl>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg border border-blue-100">
            <div className="px-4 py-5 sm:p-6">
              <dl>
                <dt className="text-sm font-medium text-blue-600 truncate">Total Fields</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-900">{totalFields}</dd>
              </dl>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg border border-blue-100">
            <div className="px-4 py-5 sm:p-6">
              <dl>
                <dt className="text-sm font-medium text-blue-600 truncate">Users with Fields</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-900">
                  {users.filter(u => u.fields && Object.keys(u.fields).length > 0).length}
                </dd>
              </dl>
            </div>
          </div>
          
          <div className="bg-white overflow-hidden shadow rounded-lg border border-blue-100">
            <div className="px-4 py-5 sm:p-6">
              <dl>
                <dt className="text-sm font-medium text-blue-600 truncate">Users without Fields</dt>
                <dd className="mt-1 text-3xl font-semibold text-blue-900">
                  {users.filter(u => !u.fields || Object.keys(u.fields).length === 0).length}
                </dd>
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white shadow rounded-lg p-4 border border-blue-100">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow">
              <label htmlFor="search" className="sr-only">Search</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-blue-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  id="search"
                  name="search"
                  className="block w-full pl-10 pr-3 py-2 border border-blue-300 rounded-md leading-5 bg-white placeholder-blue-400 focus:outline-none focus:placeholder-blue-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Search users by name or email"
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedFilter === "all" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setSelectedFilter("with-fields")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedFilter === "with-fields" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"
                }`}
              >
                With Fields
              </button>
              <button
                onClick={() => setSelectedFilter("no-fields")}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  selectedFilter === "no-fields" 
                    ? "bg-blue-600 text-white" 
                    : "bg-white border border-blue-300 text-blue-700 hover:bg-blue-50"
                }`}
              >
                No Fields
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-md border border-blue-100">
            <div className="px-4 py-3 border-b border-blue-200 bg-blue-50">
              <div className="text-sm text-blue-600">
                Showing <span className="font-medium text-blue-800">{filteredUsers.length}</span> of <span className="font-medium text-blue-800">{users.length}</span> users
              </div>
            </div>
            
            {filteredUsers.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <svg className="mx-auto h-12 w-12 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-blue-900">No users found</h3>
                <p className="mt-1 text-sm text-blue-500">Try adjusting your search or filter to find what you're looking for.</p>
                <div className="mt-6">
                  <button
                    onClick={() => {setSearch(""); setSelectedFilter("all");}}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Reset filters
                  </button>
                </div>
              </div>
            ) : (
              <ul className="divide-y divide-blue-100">
                {filteredUsers.map((user) => (
                  <li key={user.uid} className={`hover:bg-blue-50 transition-colors ${expandedUser === user.uid ? 'bg-blue-50' : ''}`}>
                    <div 
                      className="px-4 py-4 sm:px-6 cursor-pointer"
                      onClick={() => toggleExpandUser(user.uid)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-lg font-medium text-blue-800">
                              {getInitials(user.name)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-blue-900">{user.name || "(No Name)"}</div>
                            <div className="text-sm text-blue-500">{user.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 mr-2">
                            {user.fields ? Object.keys(user.fields).length : 0} fields
                          </span>
                          <svg 
                            className={`h-5 w-5 text-blue-500 transition-transform ${expandedUser === user.uid ? 'transform rotate-180' : ''}`} 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                      
                    {expandedUser === user.uid && user.fields && Object.keys(user.fields).length > 0 && (
                      <div className="px-4 py-4 sm:px-6 border-t border-blue-100 bg-blue-50">
                        <h4 className="text-sm font-medium text-blue-700 mb-3">Field Details</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {Object.values(user.fields).map((field: Field) => (
                            <div key={field.id} className="border border-blue-200 rounded-md p-3 bg-white shadow-sm">
                              <div className="font-medium text-sm text-blue-900">{field.name}</div>
                              <div className="text-xs text-blue-400 mb-2">ID: {field.id.substring(0, 8)}...</div>
                              <div className="flex gap-3 text-xs">
                                <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800">
                                  Area: {field.area?.toFixed(2)}
                                </span>
                                <span className="px-2 py-1 rounded-md bg-blue-100 text-blue-800">
                                  Perimeter: {field.perimeter?.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-blue-200 mt-8">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-sm text-blue-600">
              &copy; {new Date().getFullYear()} Map My Field Admin
            </div>
            <div className="text-sm text-blue-600 mt-2 md:mt-0">
              Powered by Next.js & Firebase
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AdminPage;
