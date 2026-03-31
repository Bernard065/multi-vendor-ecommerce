import { useMutation } from '@tanstack/react-query';
import { SHOP_CATEGORIES } from '../../../constants/categories';
import axios, { AxiosError } from 'axios';
import React from 'react';
import { useForm } from 'react-hook-form';

type CreateShopFormValues = {
  name: string;
  bio: string;
  category: string;
  address: string;
  website?: string;
  opening_hours?: string;
};

const CreateShop = ({
  sellerId,
  setActiveStep,
}: {
  sellerId: string | null;
  setActiveStep: (step: number) => void;
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateShopFormValues>();

  const shopCreationMutation = useMutation({
    mutationFn: async (data: CreateShopFormValues & { sellerId: string | null }) => {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_SERVER_URI}/api/create-shop`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      setActiveStep(3); // Move to the next step after successful shop creation
    },
    onError: (error: AxiosError) => {
      console.error('Shop creation failed:', error.response?.data || error.message);
    },
  });

  const onSubmit = (data: CreateShopFormValues) => {
    const shopData = { ...data, sellerId };
    shopCreationMutation.mutate(shopData);
  };

  const countWords = (text: string) => {
    return text.trim().split(/\s+/).length;
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <h3 className="text-2xl font-semibold text-center mb-4">Setup new shop</h3>

      <label htmlFor="name" className="block text-gray-700 mb-1">
        Name
      </label>
      <input
        id="name"
        type="text"
        placeholder="Shop Name"
        className="w-full p-2 border border-gray-300 outline-0 !rounded"
        {...register('name', { required: 'Name is required' })}
      />
      {errors.name && <p className="text-red-500 text-sm">{errors.name.message}</p>}

      <label htmlFor="bio" className="block text-gray-700 mb-1">
        Bio
      </label>
      <textarea
        id="bio"
        cols={10}
        rows={4}
        placeholder="Shop Bio"
        className="w-full p-2 border border-gray-300 outline-0 !rounded"
        {...register('bio', {
          required: 'Bio is required',
          validate: (value) => countWords(value) <= 100 || 'Bio must be less than 100 words',
        })}
      />
      {errors.bio && <p className="text-red-500 text-sm">{errors.bio.message}</p>}

      <label htmlFor="category" className="block text-gray-700 mb-1">
        Category
      </label>
      <select
        id="category"
        className="w-full p-2 border border-gray-300 outline-0 !rounded bg-white"
        {...register('category', { required: 'Category is required' })}
      >
        <option value="">Select Category</option>
        {SHOP_CATEGORIES.map((category) => (
          <option key={category.value} value={category.value}>
            {category.label}
          </option>
        ))}
      </select>
      {errors.category && <p className="text-red-500 text-sm">{errors.category.message}</p>}

      <label htmlFor="address" className="block text-gray-700 mb-1">
        Address
      </label>
      <input
        id="address"
        type="text"
        placeholder="Shop Address"
        className="w-full p-2 border border-gray-300 outline-0 !rounded"
        {...register('address', { required: 'Address is required' })}
      />
      {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}

      <label htmlFor="website" className="block text-gray-700 mb-1">
        Website (optional)
      </label>
      <input
        id="website"
        type="text"
        placeholder="Shop Website"
        className="w-full p-2 border border-gray-300 outline-0 !rounded"
        {...register('website', {
          pattern: {
            value: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-]*)*\/?$/,
            message: 'Please enter a valid URL',
          },
        })}
      />

      <label htmlFor="opening_hours" className="block text-gray-700 mb-1">
        Opening Hours (optional)
      </label>
      <input
        id="opening_hours"
        type="text"
        placeholder="e.g. Mon-Fri 9am-5pm"
        className="w-full p-2 border border-gray-300 outline-0 !rounded"
        {...register('opening_hours')}
      />

      <button
        type="submit"
        className="w-full text-lg bg-blue-600 text-white py-2 rounded-lg mt-4"
        disabled={shopCreationMutation.isPending}
      >
        {shopCreationMutation.isPending ? 'Creating Shop...' : 'Create Shop'}
      </button>
    </form>
  );
};

export default CreateShop;
