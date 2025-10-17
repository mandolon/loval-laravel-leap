// Mock data for FileExplorer
export const MOCK_PROJECT = {
  name: 'Project Files',
  type: 'project',
  children: [
    {
      name: 'Pre-Design',
      type: 'phase',
      children: [
        { name: 'Initial', type: 'folder' },
        { name: 'Research', type: 'folder' },
      ],
    },
    {
      name: 'Design',
      type: 'phase',
      children: [
        { name: 'Plans', type: 'folder' },
        { name: 'Drawings', type: 'folder' },
      ],
    },
    {
      name: 'Permit',
      type: 'phase',
      children: [
        { name: 'Documents', type: 'folder' },
      ],
    },
    {
      name: 'Build',
      type: 'phase',
      children: [
        { name: 'Photos', type: 'folder' },
      ],
    },
  ],
};

export const MOCK_FILES = [
  {
    name: 'floor-plan.pdf',
    type: 'file',
    size: '2.3 MB',
    modified: 'Feb 10, 25',
    phase: 'Design',
    folder: 'Plans',
  },
  {
    name: 'elevation.pdf',
    type: 'file',
    size: '1.8 MB',
    modified: 'Feb 11, 25',
    phase: 'Design',
    folder: 'Drawings',
  },
];
