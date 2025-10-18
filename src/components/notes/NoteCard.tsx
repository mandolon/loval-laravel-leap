import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MoreVertical, Edit2, Trash2, Save, X } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import type { Note } from '@/lib/api/hooks/useNotes'

interface NoteCardProps {
  note: Note
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
}

export const NoteCard = ({ note, onUpdate, onDelete }: NoteCardProps) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState(note.content)

  const handleSave = () => {
    if (editedContent.trim() !== note.content) {
      onUpdate(note.id, editedContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditedContent(note.content)
    setIsEditing(false)
  }

  return (
    <Card className="group hover:shadow-md transition-all duration-200">
      <CardContent className="pt-4">
        {isEditing ? (
          <div className="space-y-3">
            <Textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="min-h-[100px] resize-none"
              placeholder="Enter note content..."
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave}>
                <Save className="h-3.5 w-3.5 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <p className="text-base whitespace-pre-wrap flex-1">{note.content}</p>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Edit2 className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(note.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between text-base text-muted-foreground">
              <span>
                {format(new Date(note.createdAt), 'MMM d, yyyy')}
                {note.updatedAt !== note.createdAt && ' (edited)'}
              </span>
              <span className="font-mono">{note.shortId}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
