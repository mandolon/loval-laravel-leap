import { useEffect, useState, useRef, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { GitBranch, GitCommit, GitPullRequest, User, Clock } from 'lucide-react';

interface GitHubCommit {
  sha: string;
  commit: {
    author: {
      name: string;
      date: string;
    };
    message: string;
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
}

interface GitHubActivityFeedProps {
  owner?: string;
  repo?: string;
  branch?: string;
  maxItems?: number;
  hideKeywords?: string[]; // Keywords to filter out from commit messages
  hideAuthors?: string[]; // Author usernames to filter out
}

export function GitHubActivityFeed({
  owner = 'mandolon',
  repo = 'app.rehome',
  branch = 'main',
  maxItems = 100, // Increased to load more commits
  hideKeywords = [],
  hideAuthors = []
}: GitHubActivityFeedProps) {
  const [commits, setCommits] = useState<GitHubCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);

  const fetchCommits = useCallback(async (pageNum: number, append: boolean = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }
      setError(null);
      
      // GitHub API endpoint for commits (max 100 per page)
      const perPage = 100;
      const url = `https://api.github.com/repos/${owner}/${repo}/commits?sha=${branch}&per_page=${perPage}&page=${pageNum}`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.length < perPage) {
        setHasMore(false);
      }
      
      if (append) {
        setCommits(prev => [...prev, ...data]);
      } else {
        setCommits(data);
      }
    } catch (err) {
      console.error('Error fetching GitHub commits:', err);
      setError(err instanceof Error ? err.message : 'Failed to load GitHub activity');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [owner, repo, branch]);

  useEffect(() => {
    fetchCommits(1, false);
  }, [fetchCommits]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading]);

  // Load more when page changes
  useEffect(() => {
    if (page > 1) {
      fetchCommits(page, true);
    }
  }, [page, fetchCommits]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg bg-slate-50 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-3/4" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200">
        <div className="flex items-start gap-2">
          <svg className="w-5 h-5 text-red-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-800">Unable to load GitHub activity</p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Filter out commits based on keywords and authors
  const filteredCommits = commits.filter((commit) => {
    const commitMessage = commit.commit.message.toLowerCase();
    const authorName = commit.author?.login || commit.commit.author.name;
    
    // Check if commit message contains any hide keywords
    const hasHiddenKeyword = hideKeywords.some(keyword => 
      commitMessage.includes(keyword.toLowerCase())
    );
    
    // Check if author is in the hide list
    const isHiddenAuthor = hideAuthors.some(author => 
      authorName.toLowerCase() === author.toLowerCase()
    );
    
    // Keep commit if it doesn't match any hide criteria
    return !hasHiddenKeyword && !isHiddenAuthor;
  });

  if (filteredCommits.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <GitBranch className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No recent commits</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {filteredCommits.map((commit) => {
        const commitMessage = commit.commit.message.split('\n')[0]; // First line only
        const authorName = commit.author?.login || commit.commit.author.name;
        const avatarUrl = commit.author?.avatar_url;
        const timeAgo = formatDistanceToNow(new Date(commit.commit.author.date), { addSuffix: true });

        return (
          <div
            key={commit.sha}
            className="flex gap-2 p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <GitCommit className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">
                    {commitMessage}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {timeAgo}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      
      {/* Loading indicator for lazy loading */}
      {hasMore && (
        <div ref={observerTarget} className="py-4">
          {loadingMore && (
            <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
              <span>Loading more commits...</span>
            </div>
          )}
        </div>
      )}
      
      {!hasMore && filteredCommits.length > 0 && (
        <div className="py-4 text-center text-sm text-slate-500">
          End
        </div>
      )}
    </div>
  );
}
