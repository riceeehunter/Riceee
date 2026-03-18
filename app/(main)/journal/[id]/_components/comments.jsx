"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { addComment, deleteComment } from "@/actions/comment";
import { format } from "date-fns";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function Comments({ entryId, initialComments }) {
  const [comments, setComments] = useState(initialComments || []);
  const [newComment, setNewComment] = useState("");
  const [author, setAuthor] = useState("Hunter x Riceee");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) {
      toast.error("Please write a comment");
      return;
    }

    setIsSubmitting(true);
    const result = await addComment({
      content: newComment,
      author,
      entryId,
    });

    if (result.success) {
      setComments([...comments, result.data]);
      setNewComment("");
      toast.success("Comment added! 💗");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setIsSubmitting(false);
  };

  const handleDelete = async (commentId) => {
    setDeletingId(commentId);
    const result = await deleteComment(commentId);

    if (result.success) {
      setComments(comments.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
      router.refresh();
    } else {
      toast.error(result.error);
    }
    setDeletingId(null);
  };

  return (
    <div className="mt-8 space-y-6">
      <hr />
      
      <div>
        <h3 className="text-2xl font-semibold mb-4">
          Comments 💬 {comments.length > 0 && `(${comments.length})`}
        </h3>

        {/* Comment Form */}
        <form onSubmit={handleSubmit} className="space-y-3 mb-6">
          <div className="flex gap-3 items-start">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Leave a sweet comment... 💗"
              className="flex-1"
              rows={3}
              disabled={isSubmitting}
            />
          </div>
          
          <div className="flex gap-3 items-center">
            <Select value={author} onValueChange={setAuthor} disabled={isSubmitting}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Commenting as..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Hunter">Hunter 💙</SelectItem>
                <SelectItem value="Riceee">Riceee 💗</SelectItem>
                <SelectItem value="Hunter x Riceee">Hunter x Riceee 💕</SelectItem>
              </SelectContent>
            </Select>
            
            <Button type="submit" disabled={isSubmitting || !newComment.trim()}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post Comment
            </Button>
          </div>
        </form>

        {/* Comments List */}
        <div className="space-y-4">
          {comments.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No comments yet. Be the first to leave a note! 💗
            </p>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-3 py-1 bg-white text-pink-700 rounded-full font-medium border border-pink-300">
                      {comment.author}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                
                <p className="text-gray-800 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
