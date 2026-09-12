import React from 'react';

interface PhoneFrameWrapperProps {
  children: React.ReactNode;
  enabled?: boolean;
}

export const PhoneFrameWrapper: React.FC<PhoneFrameWrapperProps> = ({ children }) => {
  return (
    <div className="w-full h-full min-h-screen flex flex-col bg-[#0D0D14] text-zinc-100 overflow-hidden">
      {children}
    </div>
  );
};

