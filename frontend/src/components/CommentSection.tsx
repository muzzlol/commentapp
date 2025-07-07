import { useEffect, useState } from 'react';
import { commentService } from '@/services/comment';
import type { CommentNode, ThreadsResponse } from '@/services/comment';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { CommentItem } from '@/components/CommentItem';

function countCommentsInNodes(nodes: CommentNode[]): number {
  return nodes.reduce((acc, node) => {
    return acc + 1 + countCommentsInNodes(node.replies);
  }, 0);
}

export function CommentSection() {
  const { isAuthenticated, user } = useAuth();
  const token = localStorage.getItem('auth_token') || '';

  const [threadsData, setThreadsData] = useState<ThreadsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [newContent, setNewContent] = useState('');
  const [posting, setPosting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await commentService.getThreads();
        setThreadsData(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, []);

  const handlePost = async () => {
    if (!newContent.trim()) return;
    setPosting(true);
    try {
      const created = await commentService.createComment({ content: newContent }, token);

      const newCommentNode: CommentNode = {
        comment: {
          ...created,
          author: {
            id: user?.id || '',
            email: user?.email || created.author?.email || '',
            pfpUrl: user?.pfpUrl || null,
          },
        },
        replies: [],
      };

      setThreadsData(prev => prev ? {
        ...prev,
        comments: [...prev.comments, newCommentNode],
        info: {
          ...prev.info,
          count: prev.info.count + 1,
        }
      } : {
        comments: [newCommentNode],
        info: { count: 1, count_left: 0, last_comment: null }
      });
      setNewContent('');
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setPosting(false);
    }
  };

  const loadMoreComments = async () => {
    if (!threadsData || threadsData.info.count_left === 0) return;
    
    setLoadingMore(true);
    try {
      const data = await commentService.getThreads({
        limit: 10,
        offset_id: threadsData.info.last_comment || undefined,
      });
      
      const loadedCount = countCommentsInNodes(data.comments);

      setThreadsData(prev => {
        if (!prev) return data;

        return {
          ...prev,
          comments: [...prev.comments, ...data.comments],
          info: {
            count: prev.info.count,
            count_left: Math.max(0, prev.info.count_left - loadedCount),
            last_comment: data.info.last_comment,
          },
        };
      });
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await commentService.seedComments();
      // Refresh the comments after seeding
      const data = await commentService.getThreads();
      setThreadsData(data);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSeeding(false);
    }
  };

  if (loading) return <p>Loading comments...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const comments = threadsData?.comments || [];
  const hasMoreComments = threadsData && threadsData.info.count_left > 0;

  return (
    <div className="space-y-4">
      {isAuthenticated && (
        <div className="space-y-2">
          <textarea
            className="w-full border rounded-md p-2 text-sm"
            rows={3}
            placeholder="Write a comment..."
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
          />
          <div>
            <Button size="sm" onClick={handlePost} disabled={posting}>
              {posting ? 'Posting...' : 'Post Comment'}
            </Button>
          </div>
        </div>
      )}

      {comments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">No comments yet.</p>
          <Button 
            variant="outline" 
            onClick={handleSeed} 
            disabled={seeding}
            size="sm"
          >
            {seeding ? 'Creating sample comments...' : 'Populate with sample comments'}
          </Button>
        </div>
      )}

      {comments.map((commentNode: CommentNode) => (
        <CommentItem key={commentNode.comment.id} commentNode={commentNode} />
      ))}

      {hasMoreComments && (
        <div className="flex justify-center mt-6">
          <Button 
            variant="outline" 
            onClick={loadMoreComments} 
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading...' : `Load ${threadsData?.info.count_left} more comments`}
          </Button>
        </div>
      )}
    </div>
  );
} 