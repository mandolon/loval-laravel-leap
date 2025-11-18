import { Vector3 } from 'three';

export interface Annotation {
  id: string;
  position: Vector3;
  text: string;
  createdAt: Date;
  updatedAt: Date;
  isNew?: boolean;
  dbId?: string; // Database ID for persisted annotations
}

