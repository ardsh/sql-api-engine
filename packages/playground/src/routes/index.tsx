import React from 'react';
import { RouteObject } from 'react-router-dom';
import Main from '@/pages/main';
import NotFound from '@/pages/NotFound';

export default [
  {
    path: '/',
    children: [{ index: true, element: <Main /> }],
  },
  {
    path: '/*',
    element: <Main />,
  },
] as RouteObject[];
