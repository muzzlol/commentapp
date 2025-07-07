import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { commentService } from '@/services/comment';
import type { CommentNode, BasicComment } from '@/services/comment';
import { useAuth } from '@/contexts/AuthContext';

interface CommentItemProps {
  commentNode: CommentNode;
  depth?: number;
  onReplyAdded?: (parentId: string, reply: BasicComment) => void;
  onUpdate?: (updated: BasicComment) => void;
}

export function CommentItem({ commentNode: initialCommentNode, depth = 0, onReplyAdded, onUpdate }: CommentItemProps) {
  const { user } = useAuth();
  const token = localStorage.getItem('auth_token') || '';

  const [commentNode, setCommentNode] = useState<CommentNode>(initialCommentNode);
  const [replyContent, setReplyContent] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(initialCommentNode.comment.content);

  const comment = commentNode.comment;
  const replies = commentNode.replies;

  const canReply = !!user && !comment.deletedAt;
  const canEditDelete = !!user && user.id === comment.author.id && !comment.deletedAt;
  const canRestore = !!user && user.id === comment.author.id && !!comment.deletedAt;

  const handleReplySubmit = async () => {
    if (!replyContent.trim()) return;
    try {
      const newReplyRaw = await commentService.createComment({ content: replyContent, parentId: comment.id }, token);
      const newReplyNode: CommentNode = {
        comment: {
          ...newReplyRaw,
          author: {
            id: user!.id,
            email: user!.email,
            pfpUrl: user!.pfpUrl ?? null,
          },
        },
        replies: [],
      };
      setReplyContent('');
      setIsReplying(false);
      // Optimistically add reply to list
      setCommentNode(prev => ({
        ...prev,
        replies: [...prev.replies, newReplyNode],
      }));
      onReplyAdded?.(comment.id, newReplyRaw);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleEditSubmit = async () => {
    if (!editContent.trim() || editContent === comment.content) {
      setIsEditing(false);
      return;
    }
    try {
      const updated = await commentService.editComment(comment.id, { content: editContent }, token);
      setCommentNode(prev => ({ 
        ...prev, 
        comment: { ...prev.comment, content: updated.content, updatedAt: updated.updatedAt }
      }));
      setIsEditing(false);
      onUpdate?.(updated);
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this comment?')) return;
    try {
      await commentService.deleteComment(comment.id, token);
      setCommentNode(prev => ({ 
        ...prev, 
        comment: { ...prev.comment, deletedAt: new Date().toISOString(), content: '[deleted]' }
      }));
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const handleRestore = async () => {
    try {
      const restored = await commentService.restoreComment(comment.id, token);
      setCommentNode(prev => ({
        ...prev,
        comment: {
          ...restored,
          author: comment.author,
        }
      }));
    } catch (error) {
      alert((error as Error).message);
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className={`mt-4 ${depth > 0 ? 'border-l-2 border-gray-200 pl-4' : ''}`} style={{ marginLeft: depth > 0 ? '20px' : '0' }}>
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-semibold">
          {comment.author.email.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium text-gray-900">{comment.author.email.split('@')[0]}</span>
            <span>•</span>
            <span>{timeAgo(comment.createdAt)}</span>
            {comment.updatedAt && comment.updatedAt !== comment.createdAt && !comment.deletedAt && (
              <span className="italic text-xs">(edited)</span>
            )}
          </div>

          {comment.deletedAt ? (
            <p className="italic text-gray-400">[deleted]</p>
          ) : isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEditSubmit}>Save</Button>
                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="mt-2 text-gray-800 whitespace-pre-line">{comment.content}</p>
          )}

          <div className="mt-2 flex gap-3 text-xs text-gray-500">
            {canReply && !isEditing && (
              <button onClick={() => setIsReplying(prev => !prev)} className="hover:underline">Reply</button>
            )}
            {canEditDelete && !isEditing && (
              <>
                <button onClick={() => setIsEditing(true)} className="hover:underline">Edit</button>
                <button onClick={handleDelete} className="hover:underline">Delete</button>
              </>
            )}
            {canRestore && (
              <button onClick={handleRestore} className="hover:underline">Restore</button>
            )}
          </div>

          {isReplying && (
            <div className="mt-2 space-y-2">
              <textarea
                className="w-full border rounded-md p-2 text-sm"
                value={replyContent}
                onChange={e => setReplyContent(e.target.value)}
                rows={3}
                placeholder="Write your reply..."
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleReplySubmit}>Post Reply</Button>
                <Button variant="outline" size="sm" onClick={() => setIsReplying(false)}>Cancel</Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {replies.map(replyNode => (
            <CommentItem
              key={replyNode.comment.id}
              commentNode={replyNode}
              depth={depth + 1}
              onReplyAdded={onReplyAdded}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </div>
    </div>
  );
} 