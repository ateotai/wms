import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PickingTasks } from './PickingTasks';

export function PutawayTasks() {
  // Ya no forzamos el parámetro 'only=putaway' en la URL porque usamos el prop mode="putaway"
  return <PickingTasks mode="putaway" />;
}

export default PutawayTasks;