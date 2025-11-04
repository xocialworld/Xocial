'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Users, MapPin, Globe } from 'lucide-react';

export function FacebookDemographics() {
  const [demographics, setDemographics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchDemographics();
  }, []);
  
  async function fetchDemographics() {
    try {
      const res = await fetch('/api/analytics/facebook/demographics');
      const data = await res.json();
      setDemographics(data.demographics);
    } catch (error) {
      console.error('Failed to load demographics:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return <Card className="p-6"><Spinner /></Card>;
  }
  
  if (!demographics) {
    return (
      <Card className="p-6">
        <p className="text-gray-500">Connect Facebook to see demographics</p>
      </Card>
    );
  }
  
  const topCountries = Object.entries(demographics.countries || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);
  
  const topCities = Object.entries(demographics.cities || {})
    .sort(([, a]: any, [, b]: any) => b - a)
    .slice(0, 5);
  
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Audience Demographics</h3>
        </div>
        
        <div className="space-y-4">
          {Object.entries(demographics.ageGender || {}).map(([key, value]: any) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{key}</span>
              <span className="font-medium">{value}</span>
            </div>
          ))}
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Top Countries</h3>
        </div>
        
        <div className="space-y-2">
          {topCountries.map(([country, count]: any) => (
            <div key={country} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{country}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </Card>
      
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold">Top Cities</h3>
        </div>
        
        <div className="space-y-2">
          {topCities.map(([city, count]: any) => (
            <div key={city} className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{city}</span>
              <span className="font-medium">{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

