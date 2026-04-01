import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import axiosInstance from '../utils/axiosInstance';

// Fetch seller data from API
const fetchSeller = async () => {
  try {
    const response = await axiosInstance.get('/api/logged-in-seller');
    return response.data.seller;
  } catch (error) {
    // Cast to AxiosError for type-safe access to response
    const axiosError = error as AxiosError;
    // If unauthorized or not found, return null (user not logged in)
    if (axiosError.response?.status === 401 || axiosError.response?.status === 404) {
      return null;
    }
    throw error; // Re-throw other errors
  }
};

const useSeller = () => {
  const {
    data: seller,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['seller'],
    queryFn: fetchSeller,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 5, // Keep data for 5 minutes even if unmounted
    retry: (failureCount, error: AxiosError) => {
      const axiosError = error as AxiosError;
      // Don't retry on 401 (unauthorized) or 404 (not found)
      if (axiosError.response?.status === 401 || axiosError.response?.status === 404) {
        return false;
      }
      // Retry once for other errors
      return failureCount < 1;
    },
  });

  return { seller, isLoading, isError, refetch };
};

export default useSeller;
