import * as React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Pin, PinOff, Tag, Palette, SortAsc, SortDesc, Search } from 'lucide-react';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, Timestamp, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { exportNotesToPDF } from '@/utils/exportUtils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import Masonry from 'react-masonry-css';

interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  tags: string[];
  color: string;
  pinned: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const COLOR_OPTIONS = [
  '#f87171', // red
  '#fbbf24', // yellow
  '#34d399', // green
  '#60a5fa', // blue
  '#a78bfa', // purple
  '#f472b6', // pink
  '#facc15', // gold
  '#d1d5db', // gray
  '#fff',    // white
];

// Helper to strip HTML and truncate
function getNotePreview(html: string, maxLength = 120) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const text = tmp.textContent || tmp.innerText || '';
  return text.length > maxLength ? text.slice(0, maxLength) + '…' : text;
}

// Utility function to strip HTML tags
function stripHtml(html: string) {
  const div = document.createElement('div');
  div.innerHTML = html;
  return div.textContent || div.innerText || '';
}

const Notes: React.FC = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editNote, setEditNote] = React.useState<Note | null>(null);
  const [form, setForm] = React.useState({ title: '', content: '', tags: '', color: COLOR_OPTIONS[3] });
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'createdAt'|'oldest'|'title'|'pinned'>('pinned');
  const [sortDir, setSortDir] = React.useState<'asc'|'desc'>('desc');
  const [dateRange, setDateRange] = React.useState<{from: Date|null, to: Date|null}>({from: null, to: null});

  const loadNotes = async () => {
    if (!currentUser) return;
    if (!currentUser.emailVerified) {
      toast({ title: 'Email Not Verified', description: 'Please verify your email before adding notes.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const notesRef = collection(db, 'notes');
      const q = query(notesRef, where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const notesList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title,
          content: data.content,
          tags: data.tags || [],
          color: data.color || COLOR_OPTIONS[3],
          pinned: data.pinned || false,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
        } as Note;
      });
      setNotes(notesList);
    } catch {
      toast({ title: "Error", description: "Could not load notes. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { loadNotes(); }, [currentUser]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Error", description: "Title and content required.", variant: "destructive" });
      return;
    }
    try {
      await addDoc(collection(db, 'notes'), {
        userId: currentUser.uid,
        title: form.title,
        content: form.content,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        color: form.color,
        pinned: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Note added!" });
      setForm({ title: '', content: '', tags: '', color: COLOR_OPTIONS[3] });
      setIsAddDialogOpen(false);
      loadNotes();
    } catch {
      toast({ title: "Error", description: "Could not add note. Please try again.", variant: "destructive" });
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNote) return;
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Error", description: "Title and content required.", variant: "destructive" });
      return;
    }
    try {
      const noteRef = doc(db, 'notes', editNote.id);
      await updateDoc(noteRef, {
        title: form.title,
        content: form.content,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        color: form.color,
        updatedAt: Timestamp.now(),
      });
      toast({ title: "Note updated!" });
      setIsEditDialogOpen(false);
      setEditNote(null);
      setForm({ title: '', content: '', tags: '', color: COLOR_OPTIONS[3] });
      loadNotes();
    } catch {
      toast({ title: "Error", description: "Could not update note. Please try again.", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notes', id));
      toast({ title: "Note deleted!" });
      setDeletingId(null);
      loadNotes();
    } catch {
      toast({ title: "Error", description: "Could not delete note. Please try again.", variant: "destructive" });
    }
  };

  const handlePin = async (note: Note, pin: boolean) => {
    try {
      const noteRef = doc(db, 'notes', note.id);
      await updateDoc(noteRef, { pinned: pin, updatedAt: Timestamp.now() });
      loadNotes();
    } catch {
      toast({ title: "Error", description: "Could not pin/unpin note. Please try again.", variant: "destructive" });
    }
  };

  // Filtering, searching, sorting
  let filteredNotes = notes.filter(note => {
    // Search
    const matchesSearch = !search || note.title.toLowerCase().includes(search.toLowerCase()) || note.content.toLowerCase().includes(search.toLowerCase());
    // Date range
    let matchesDate = true;
    if (dateRange.from instanceof Date && dateRange.to instanceof Date) {
      matchesDate = note.createdAt >= dateRange.from && note.createdAt <= dateRange.to;
    } else if (dateRange.from instanceof Date) {
      matchesDate = note.createdAt.toDateString() === dateRange.from.toDateString();
    }
    return matchesSearch && matchesDate;
  });

  // Sort
  if (sortBy === 'createdAt') {
    // Latest Date
    filteredNotes = filteredNotes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  } else if (sortBy === 'oldest') {
    // Oldest Date
    filteredNotes = filteredNotes.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  } else if (sortBy === 'title') {
    // Title (A-Z)
    filteredNotes = filteredNotes.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortBy === 'pinned') {
    // Pinned first
    filteredNotes = filteredNotes.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto py-10 px-4 animate-fade-in">
        {/* Header: Title/Subtitle left, Buttons right */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div className="animate-fade-in w-full sm:w-auto">
            {filteredNotes.length > 0 && (
              <>
                <h1 className="text-3xl font-bold text-foreground">Notes</h1>
                <p className="text-muted-foreground mt-1">Organize your thoughts and ideas</p>
              </>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center">
            <Button
              onClick={() => {
                if (!notes.length) {
                  toast({ title: 'No Data', description: 'No notes found to export.' });
                  return;
                }
                try {
                  // Create filter information string
                  const filterParts = [];
                  if (search) filterParts.push(`Search: "${search}"`);
                  if (dateRange.from && dateRange.to) {
                    filterParts.push(`Date Range: ${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`);
                  } else if (dateRange.from) {
                    filterParts.push(`Date: ${dateRange.from.toLocaleDateString()}`);
                  }
                  if (sortBy !== 'pinned') {
                    const sortLabels = {
                      'createdAt': 'Latest Date',
                      'oldest': 'Oldest Date',
                      'title': 'Title (A-Z)'
                    };
                    filterParts.push(`Sort: ${sortLabels[sortBy] || 'Pinned'}`);
                  }

                  const filterInfo = filterParts.length > 0 ? filterParts.join(' | ') : undefined;
                  
                  exportNotesToPDF(filteredNotes, currentUser?.displayName || 'User', filterInfo);
                  toast({ title: 'Success', description: 'Notes exported to PDF!' });
                } catch (error) {
                  toast({ title: 'Error', description: 'Failed to export notes.', variant: 'destructive' });
                }
              }}
              variant="outline"
              className="w-full sm:w-auto"
            >
              Export Notes (PDF)
            </Button>
            <Button onClick={() => setIsAddDialogOpen(true)} className="w-full sm:w-auto bg-primary text-white hover:bg-primary/90 shadow rounded-full">
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </Button>
          </div>
        </div>

        {/* Controls Row: Search, Date, Sort */}
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-stretch sm:items-center mb-6">
          <div className="flex-1">
            <Input
              placeholder="Search notes..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center border rounded-md px-3 py-2 bg-background hover:bg-accent transition-colors text-sm min-w-[180px]"
              >
                <Search className="w-4 h-4 mr-2 text-muted-foreground" />
                {dateRange.from && dateRange.to
                  ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                  : dateRange.from
                    ? dateRange.from.toLocaleDateString()
                    : 'Pick a date'}
                {dateRange.from && (
                  <span
                    className="w-4 h-4 ml-2 text-muted-foreground cursor-pointer hover:text-destructive"
                    onClick={e => {
                      e.stopPropagation();
                      setDateRange({from: null, to: null});
                    }}
                  >✕</span>
                )}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={dateRange && dateRange.from instanceof Date ? dateRange : {from: null, to: null}}
                onSelect={range => setDateRange({from: range?.from || null, to: range?.to || null})}
                numberOfMonths={1}
                className="rounded-md border shadow-lg"
              />
            </PopoverContent>
          </Popover>
          {/* Sort By Dropdown */}
          <div className="w-full sm:w-[200px]">
            <Select value={sortBy} onValueChange={v => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="createdAt">Latest Date</SelectItem>
                <SelectItem value="oldest">Oldest Date</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="pinned">Pinned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">Loading notes...</div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <img src="/illustration/Notes.svg" alt="No notes" className="w-28 h-28 mb-4 animate-float" />
            <div className="text-xl font-semibold mb-2">No Notes Yet</div>
            <div className="mb-4">Start by adding your first note to organize your thoughts and ideas!</div>
            <Button
              className="px-4 py-2 rounded-full bg-primary text-white font-medium shadow hover:bg-primary/90 flex items-center gap-2"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Note
            </Button>
          </div>
        ) : (
          <Masonry
            breakpointCols={{ default: 3, 1100: 2, 700: 1 }}
            className="flex w-auto gap-6"
            columnClassName="masonry-column"
          >
            {filteredNotes.map(note => (
              <div
                key={note.id}
                className="mb-6 relative flex flex-col rounded-xl shadow bg-background border transition-transform hover:scale-[1.03] hover:shadow-2xl overflow-hidden"
                style={{ minWidth: 0, maxWidth: 400, padding: 24, borderLeft: `6px solid ${note.color || '#3b82f6'}` }}
              >
                {/* Content */}
                <div>
                  <h2 className="text-lg font-semibold mb-1 break-words whitespace-pre-line">{note.title}</h2>
                  <div className="text-sm text-muted-foreground mb-2 break-words whitespace-pre-line">{stripHtml(note.content)}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {note.tags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-muted text-xs text-muted-foreground border border-muted-foreground/20"><Tag className="w-3 h-3 mr-1" />{tag}</span>
                    ))}
                  </div>
                </div>
                {/* Footer: Date + Icons pinned to bottom */}
                <div className="mt-auto flex flex-col gap-2">
                  <div className="text-xs text-muted-foreground">{note.createdAt.toLocaleDateString()}</div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => handlePin(note, !note.pinned)}>
                      {note.pinned ? <PinOff className="w-4 h-4 text-yellow-400" /> : <Pin className="w-4 h-4" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => { setEditNote(note); setForm({ title: note.title, content: note.content, tags: note.tags.join(', '), color: note.color }); setIsEditDialogOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-muted-foreground" onClick={() => setDeletingId(note.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </Masonry>
        )}
        <Button onClick={() => setIsAddDialogOpen(true)} className="fixed bottom-6 right-6 md:hidden z-50 rounded-full shadow-lg bg-primary text-white w-14 h-14 flex items-center justify-center text-3xl hover:bg-primary/90 focus:ring-2 focus:ring-primary focus:outline-none">
          <Plus className="w-7 h-7" />
        </Button>
      </div>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-full h-full max-w-none max-h-none p-2 overflow-y-auto sm:max-w-3xl sm:h-[90vh] sm:p-6 flex flex-col">
            <DialogHeader>
              <DialogTitle>Add Note</DialogTitle>
              <DialogDescription>Write a new note below. Use commas for multiple tags.</DialogDescription>
            </DialogHeader>
          <form onSubmit={handleAdd} className="flex flex-col flex-1 space-y-4">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={100}
                required
              />
            <div className="flex-1">
              <ReactQuill
                value={form.content}
                onChange={val => setForm(f => ({ ...f, content: val }))}
                style={{ height: '100%', minHeight: 200 }}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['clean']
                  ]
                }}
                formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'blockquote', 'code-block', 'link', 'color', 'background']}
              />
            </div>
              <Input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${form.color === color ? 'border-primary' : 'border-muted-foreground/20'}`}
                    style={{ background: color }}
                    onClick={() => setForm(f => ({ ...f, color }))}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Add</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={v => { setIsEditDialogOpen(v); if (!v) setEditNote(null); }}>
        <DialogContent className="w-full h-full max-w-none max-h-none p-2 overflow-y-auto sm:max-w-3xl sm:h-[90vh] sm:p-6 flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Note</DialogTitle>
              <DialogDescription>Update your note below. Use commas for multiple tags.</DialogDescription>
            </DialogHeader>
          <form onSubmit={handleEdit} className="flex flex-col flex-1 space-y-4">
              <Input
                placeholder="Title"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                maxLength={100}
                required
              />
            <div className="flex-1">
              <ReactQuill
                value={form.content}
                onChange={val => setForm(f => ({ ...f, content: val }))}
                style={{ height: '100%', minHeight: 200 }}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link'],
                    [{ 'color': [] }, { 'background': [] }],
                    ['clean']
                  ]
                }}
                formats={['header', 'bold', 'italic', 'underline', 'strike', 'list', 'bullet', 'blockquote', 'code-block', 'link', 'color', 'background']}
              />
            </div>
              <Input
                placeholder="Tags (comma separated)"
                value={form.tags}
                onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
              />
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-muted-foreground" />
                {COLOR_OPTIONS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-6 h-6 rounded-full border-2 ${form.color === color ? 'border-primary' : 'border-muted-foreground/20'}`}
                    style={{ background: color }}
                    onClick={() => setForm(f => ({ ...f, color }))}
                    title={color}
                  />
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                <Button type="submit" className="flex-1">Update</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deletingId} onOpenChange={v => { if (!v) setDeletingId(null); }}>
          <DialogContent className="sm:max-w-[350px]">
            <DialogHeader>
              <DialogTitle>Delete Note?</DialogTitle>
              <DialogDescription>This action cannot be undone.</DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setDeletingId(null)} className="flex-1">Cancel</Button>
              <Button type="button" variant="destructive" className="flex-1" onClick={() => deletingId && handleDelete(deletingId)}>Delete</Button>
            </div>
          </DialogContent>
        </Dialog>
    </Layout>
  );
};

export default Notes; 