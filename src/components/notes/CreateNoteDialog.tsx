import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus } from 'lucide-react'

interface CreateNoteDialogProps {
  onCreateNote: (content: string) => void
}

export const CreateNoteDialog = ({ onCreateNote }: CreateNoteDialogProps) => {
  const [open, setOpen] = useState(false)
  const [content, setContent] = useState('')

  const handleSubmit = () => {
    if (content.trim()) {
      onCreateNote(content.trim())
      setContent('')
      setOpen(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          New Note
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Note</DialogTitle>
          <DialogDescription>
            Add a new note to this project
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter your note..."
            className="min-h-[150px] resize-none"
            autoFocus
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!content.trim()}>
            Create Note
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
