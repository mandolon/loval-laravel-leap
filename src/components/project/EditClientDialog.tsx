import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-react'
import type { Project } from '@/lib/api/types'

interface EditClientDialogProps {
  project: Project
  onUpdate: (data: {
    primaryClient?: Project['primaryClient']
    secondaryClient?: Project['secondaryClient']
  }) => void
}

export const EditClientDialog = ({ project, onUpdate }: EditClientDialogProps) => {
  const [open, setOpen] = useState(false)
  const [primaryClient, setPrimaryClient] = useState({
    firstName: project.primaryClient.firstName || '',
    lastName: project.primaryClient.lastName || '',
    email: project.primaryClient.email || '',
    phone: project.primaryClient.phone || '',
  })
  const [secondaryClient, setSecondaryClient] = useState({
    firstName: project.secondaryClient?.firstName || '',
    lastName: project.secondaryClient?.lastName || '',
    email: project.secondaryClient?.email || '',
    phone: project.secondaryClient?.phone || '',
  })

  const handleSubmit = () => {
    onUpdate({
      primaryClient,
      secondaryClient: secondaryClient.firstName || secondaryClient.lastName 
        ? secondaryClient 
        : undefined,
    })
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client Information</DialogTitle>
          <DialogDescription>
            Update primary and secondary client details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Primary Client */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Primary Client</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary-first-name">First Name *</Label>
                <Input
                  id="primary-first-name"
                  value={primaryClient.firstName}
                  onChange={(e) => setPrimaryClient({ ...primaryClient, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary-last-name">Last Name *</Label>
                <Input
                  id="primary-last-name"
                  value={primaryClient.lastName}
                  onChange={(e) => setPrimaryClient({ ...primaryClient, lastName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary-email">Email *</Label>
                <Input
                  id="primary-email"
                  type="email"
                  value={primaryClient.email}
                  onChange={(e) => setPrimaryClient({ ...primaryClient, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="primary-phone">Phone</Label>
                <Input
                  id="primary-phone"
                  type="tel"
                  value={primaryClient.phone}
                  onChange={(e) => setPrimaryClient({ ...primaryClient, phone: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Secondary Client */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Secondary Client (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="secondary-first-name">First Name</Label>
                <Input
                  id="secondary-first-name"
                  value={secondaryClient.firstName}
                  onChange={(e) => setSecondaryClient({ ...secondaryClient, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-last-name">Last Name</Label>
                <Input
                  id="secondary-last-name"
                  value={secondaryClient.lastName}
                  onChange={(e) => setSecondaryClient({ ...secondaryClient, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-email">Email</Label>
                <Input
                  id="secondary-email"
                  type="email"
                  value={secondaryClient.email}
                  onChange={(e) => setSecondaryClient({ ...secondaryClient, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="secondary-phone">Phone</Label>
                <Input
                  id="secondary-phone"
                  type="tel"
                  value={secondaryClient.phone}
                  onChange={(e) => setSecondaryClient({ ...secondaryClient, phone: e.target.value })}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!primaryClient.firstName || !primaryClient.lastName || !primaryClient.email}
          >
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}