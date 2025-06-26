"use client";
import React, { useEffect, useState } from "react";
import { fetchAllUsersWithFields } from "../lib/firebase";

interface Field {
  id: string;
  name: string;
  area: number;
  perimeter: number;
  [key: string]: any;
}

interface UserFields {
  uid: string;
  name: string;
  email: string;
  fields?: Record<string, Field>;
}

const AdminPage = () => {
  const [users, setUsers] = useState<UserFields[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const data = await fetchAllUsersWithFields();
      // Convert object to array for rendering
      const usersArr: UserFields[] = Object.entries(data).map(([uid, userData]: any) => ({
        uid,
        name: userData.name,
        email: userData.email,
        fields: userData.fields || {},
      }));
      setUsers(usersArr);
      setLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">All Registered Users & Their Fields</h1>
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-8">
          {users.length === 0 && <div>No users found.</div>}
          {users.map((user) => (
            <div key={user.uid} className="border rounded p-4 bg-white shadow">
              <div className="font-semibold text-lg">{user.name || "(No Name)"}</div>
              <div className="text-gray-600 mb-2">{user.email}</div>
              <div className="mt-2">
                <div className="font-medium">Fields:</div>
                {user.fields && Object.keys(user.fields).length > 0 ? (
                  <ul className="list-disc ml-6">
                    {Object.values(user.fields).map((field: Field) => (
                      <li key={field.id} className="mb-1">
                        <span className="font-semibold">{field.name}</span> | Area: {field.area?.toFixed(2)} | Perimeter: {field.perimeter?.toFixed(2)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-gray-500">No fields drawn.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPage;
