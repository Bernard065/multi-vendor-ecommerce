'use client';

import React from 'react';

interface BoxProps {
  css?: React.CSSProperties;
  children?: React.ReactNode;
  [key: string]: unknown;
}

const Box: React.ComponentType<BoxProps> = ({ css, children, ...rest }) => {
  return (
    <div {...rest} style={css as React.CSSProperties}>
      {children}
    </div>
  );
};

export default Box;
