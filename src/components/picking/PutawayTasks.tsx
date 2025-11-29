import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PickingTasks } from './PickingTasks';

export function PutawayTasks() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    // Asegura que el filtro de solo acomodo esté presente en la URL
    const only = (searchParams.get('only') || '').toLowerCase();
    if (only !== 'putaway') {
      const next = new URLSearchParams(searchParams);
      next.set('only', 'putaway');
      setSearchParams(next, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return <PickingTasks />;
}

export default PutawayTasks;