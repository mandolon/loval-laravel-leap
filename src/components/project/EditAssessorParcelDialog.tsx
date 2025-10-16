import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-react'

export interface AssessorParcelInfo {
  parcelNumber?: string
  occupancyClass?: string
  zoningDesignation?: string
  construction?: string
  stories?: string
  plateHeight?: string
  roofHeight?: string
  yearBuilt?: string
  lotArea?: string
  acres?: string
}

interface EditAssessorParcelDialogProps {
  data?: AssessorParcelInfo
  onUpdate: (data: AssessorParcelInfo) => void
}

export const EditAssessorParcelDialog = ({ data, onUpdate }: EditAssessorParcelDialogProps) => {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<AssessorParcelInfo>({
    parcelNumber: data?.parcelNumber || '',
    occupancyClass: data?.occupancyClass || '',
    zoningDesignation: data?.zoningDesignation || '',
    construction: data?.construction || '',
    stories: data?.stories || '',
    plateHeight: data?.plateHeight || '',
    roofHeight: data?.roofHeight || '',
    yearBuilt: data?.yearBuilt || '',
    lotArea: data?.lotArea || '',
    acres: data?.acres || '',
  })

  const handleSubmit = () => {
    onUpdate(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Edit className="h-4 w-4 mr-2" />
          Edit
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Assessor Parcel Information</DialogTitle>
          <DialogDescription>
            Update property details and parcel information
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="parcel-number">Assessor's Parcel Number</Label>
              <Input
                id="parcel-number"
                value={formData.parcelNumber}
                onChange={(e) => setFormData({ ...formData, parcelNumber: e.target.value })}
                placeholder="e.g., 123-456-789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="occupancy-class">Occupancy Class</Label>
              <Input
                id="occupancy-class"
                value={formData.occupancyClass}
                onChange={(e) => setFormData({ ...formData, occupancyClass: e.target.value })}
                placeholder="e.g., R-3"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zoning">Zoning Designation</Label>
              <Input
                id="zoning"
                value={formData.zoningDesignation}
                onChange={(e) => setFormData({ ...formData, zoningDesignation: e.target.value })}
                placeholder="e.g., RH-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="construction">Construction</Label>
              <Input
                id="construction"
                value={formData.construction}
                onChange={(e) => setFormData({ ...formData, construction: e.target.value })}
                placeholder="e.g., Type V"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stories">Stories</Label>
              <Input
                id="stories"
                value={formData.stories}
                onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
                placeholder="e.g., 2"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plate-height">Plate Height</Label>
              <Input
                id="plate-height"
                value={formData.plateHeight}
                onChange={(e) => setFormData({ ...formData, plateHeight: e.target.value })}
                placeholder="e.g., 10'"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roof-height">Roof Height</Label>
              <Input
                id="roof-height"
                value={formData.roofHeight}
                onChange={(e) => setFormData({ ...formData, roofHeight: e.target.value })}
                placeholder="e.g., 25'"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="year-built">Year Built</Label>
              <Input
                id="year-built"
                value={formData.yearBuilt}
                onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                placeholder="e.g., 1950"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lot-area">Approx Lot Area</Label>
              <Input
                id="lot-area"
                value={formData.lotArea}
                onChange={(e) => setFormData({ ...formData, lotArea: e.target.value })}
                placeholder="e.g., 2,500 sq ft"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="acres">Acres</Label>
              <Input
                id="acres"
                value={formData.acres}
                onChange={(e) => setFormData({ ...formData, acres: e.target.value })}
                placeholder="e.g., 0.057"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}