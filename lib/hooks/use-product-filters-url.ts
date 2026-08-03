'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  buildProductosHref,
  parseProductFiltersFromSearchParams,
  type ProductColumnFilters,
  type ProductColumnKey,
} from '@/lib/utils/product-filters-url'

interface InitialProductFilters {
  query: string
  columnFilters: ProductColumnFilters
}

const SEARCH_URL_DEBOUNCE_MS = 300

export function useProductFiltersUrl(
  pathname: string,
  initialFilters: InitialProductFilters
) {
  const [query, setQueryState] = useState(initialFilters.query)
  const [columnFilters, setColumnFiltersState] = useState(initialFilters.columnFilters)
  const queryRef = useRef(query)
  const columnFiltersRef = useRef(columnFilters)
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  queryRef.current = query
  columnFiltersRef.current = columnFilters

  const syncUrl = useCallback((nextQuery: string, nextColumnFilters: ProductColumnFilters) => {
    const href = buildProductosHref(pathname, nextQuery, nextColumnFilters)
    window.history.replaceState(window.history.state, '', href)
  }, [pathname])

  const setQuery = useCallback((value: string) => {
    setQueryState(value)
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => {
      syncUrl(value, columnFiltersRef.current)
    }, SEARCH_URL_DEBOUNCE_MS)
  }, [syncUrl])

  const handleColumnFilterChange = useCallback((key: ProductColumnKey, selected: string[]) => {
    setColumnFiltersState((previous) => {
      const next: ProductColumnFilters = { ...previous }
      if (selected.length === 0) {
        delete next[key]
      } else {
        next[key] = selected
      }
      syncUrl(queryRef.current, next)
      return next
    })
  }, [syncUrl])

  useEffect(() => {
    const onPopState = () => {
      const parsed = parseProductFiltersFromSearchParams(
        new URLSearchParams(window.location.search)
      )
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
      setQueryState(parsed.query)
      setColumnFiltersState(parsed.columnFilters)
    }

    window.addEventListener('popstate', onPopState)
    return () => {
      window.removeEventListener('popstate', onPopState)
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [])

  return { query, setQuery, columnFilters, handleColumnFilterChange }
}
