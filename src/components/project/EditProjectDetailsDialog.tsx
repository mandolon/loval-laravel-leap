import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Edit } from 'lucide-react'

interface EditProjectDetailsDialogProps {
  description?: string
  onUpdate: (description: string) => void
}

export const EditProjectDetailsDialog = ({ description, onUpdate }: EditProjectDetailsDialogProps) => {
  const [open, setOpen] = useState(false)
  const [narrative, setNarrative] = useState(description || '')

  const handleSubmit = () => {
    onUpdate(narrative)
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
          <DialogTitle>Edit Project Narrative</DialogTitle>
          <DialogDescription>
            Update the project description and details
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="narrative">Project Narrative</Label>
            <Textarea
              id="narrative"
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              placeholder="Enter project narrative..."
              className="min-h-[200px] resize-none"
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