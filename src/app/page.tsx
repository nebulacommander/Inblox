import LinkAccountButton from '@/components/link-account-button';
import React from 'react';

export default function Page(): React.JSX.Element {
  return (
    <div className='text-center items-center justify-center flex flex-col h-screen'>
      <LinkAccountButton />
    </div>
  );
}