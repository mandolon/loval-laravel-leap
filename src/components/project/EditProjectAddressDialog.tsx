import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-react'
import type { Project } from '@/lib/api/types'

interface EditProjectAddressDialogProps {
  address: Project['address']
  onUpdate: (address: Project['address']) => void
}

export const EditProjectAddressDialog = ({ address, onUpdate }: EditProjectAddressDialogProps) => {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    streetNumber: address?.streetNumber || '',
    streetName: address?.streetName || '',
    city: address?.city || '',
    state: address?.state || '',
    zipCode: address?.zipCode || '',
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Project Address</DialogTitle>
          <DialogDescription>
            Update the project location
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="street-number">Street Number</Label>
              <Input
                id="street-number"
                value={formData.streetNumber}
                onChange={(e) => setFormData({ ...formData, streetNumber: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="street-name">Street Name</Label>
              <Input
                id="street-name"
                value={formData.streetName}
                onChange={(e) => setFormData({ ...formData, streetName: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                maxLength={2}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zip-code">Zip Code</Label>
            <Input
              id="zip-code"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
            />
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