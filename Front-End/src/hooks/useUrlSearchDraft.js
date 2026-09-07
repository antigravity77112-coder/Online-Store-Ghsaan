import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Draft search input with URL commit on Enter/submit.
 * Used on listing pages that share ?search= in the URL.
 */
export function useUrlSearchDraft(paramName = 'search') {
  const [searchParams, setSearchParams] = useSearchParams();
  const committedSearch = searchParams.get(paramName) || '';
  const [draftSearch, setDraftSearch] = useState(committedSearch);

  useEffect(() => {
    setDraftSearch(committedSearch);
  }, [committedSearch]);

  const commitSearch = useCallback((value, { replace = true } = {}) => {
    const trimmed = (value ?? '').trim();
    const next = new URLSearchParams(searchParams);
    if (trimmed) next.set(paramName, trimmed);
    else next.delete(paramName);
    setSearchParams(next, { replace });
  }, [searchParams, setSearchParams, paramName]);

  const commitSearchNow = useCallback(() => {
    commitSearch(draftSearch, { replace: true });
  }, [draftSearch, commitSearch]);

  const clearSearch = useCallback(() => {
    setDraftSearch('');
    commitSearch('', { replace: true });
  }, [commitSearch]);

  return {
    committedSearch,
    draftSearch,
    setDraftSearch,
    commitSearchNow,
    clearSearch,
  };
}
