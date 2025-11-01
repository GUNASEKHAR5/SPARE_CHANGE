import { useState, useCallback } from 'react';

const getToken = () => localStorage.getItem('token');

export const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (endpoint, method = 'GET', body = null) => {
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const headers = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const options = { method, headers };
      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(`http://localhost:5000/api${endpoint}`, options);
      
      if (!response.ok) {
        let errorMessage = 'Something went wrong';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = response.statusText || errorMessage;
        }
        console.log(response)
        throw new Error(errorMessage);
      }

      const data = await response.json();
      setLoading(false);
      return data;
    } catch (err) {
      console.error('API request failed:', err);
      setError(err.message);
      setLoading(false);
      throw err;
    }
  }, []);

  return { loading, error, request };
};
