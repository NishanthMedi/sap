import { createSlice, combineReducers } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import {
    initialize,
    BlogFiltersEntryType,
    fetchBlogs,
    BLOGS_LIMIT_PER_PAGE,
    BlogSearchSortBy
} from '@sap/knowledge-hub-extension-types';
import type {
    AppState,
    Blogs,
    BlogsState,
    BlogsSearchQuery,
    BlogsSearchResult,
    BlogsSearchResultContentItem,
    BlogsUiState,
    BlogFiltersEntry,
    Tag,
    Error,
    ErrorAction,
    PendingAction
} from '@sap/knowledge-hub-extension-types';

import {
    blogsPageChanged,
    blogsManagedTagsAdd,
    blogsManagedTagsDelete,
    blogsManagedTagsDeleteAll,
    blogsLanguageUpdate,
    blogsOrderByUpdate,
    blogsCategoryAdd,
    blogsCategoryDelete,
    blogsCategoryDeleteAll,
    blogsFiltersSelected,
    blogsLoading,
    blogsFilterEntryAdd,
    blogsFilterEntryDelete,
    blogsFilterEntryDeleteAll,
    blogsSearchTermChanged
} from '../../store/actions';
import type { RootState } from '../../store';

export const initialBlogsQueryState: BlogsSearchQuery = {
    page: 0,
    limit: BLOGS_LIMIT_PER_PAGE,
    orderBy: BlogSearchSortBy.UPDATE_TIME,
    order: 'DESC',
    contentTypes: ['blogpost'],
    managedTags: [] as string[],
    searchTerm: '',
    questionType: '',
    language: '',
    blogCategories: [] as string[],
    authorId: '',
    userTags: '',
    updatedFrom: undefined,
    updatedTo: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    boostingStrategy: '',
    additionalManagedTags: [] as string[],
    additionalUserTags: [] as string[]
};

export const initialSearchState: BlogsState = {
    result: {
        query: initialBlogsQueryState,
        totalCount: -1,
        contentItems: []
    },
    error: {
        isError: false,
        message: ''
    },
    pending: true
};

export const initialUiState: BlogsUiState = {
    isLoading: false,
    isFiltersMenuOpened: false,
    filtersEntries: []
};

export const initialTagsState: Tag[] = [];

// Slices

const result = createSlice({
    name: 'blogsResult',
    initialState: initialSearchState,
    reducers: {},

    extraReducers: (builder) => {
        builder
            .addCase(fetchBlogs.pending.type, (state: BlogsState, action: PendingAction<string, undefined>) => {
                const pending = action.pending;
                return { ...state, pending };
            })
            .addCase(fetchBlogs.fulfilled.type, (state: BlogsState, action: PayloadAction<BlogsSearchResult>) => {
                const query: BlogsSearchQuery = action.payload.query;
                const contentItems: BlogsSearchResultContentItem[] = action.payload.contentItems;
                const totalCount = action.payload.totalCount;
                const result: BlogsSearchResult = { query, contentItems, totalCount };
                const pending = false;
                const error: Error = { isError: false, message: '' };

                return { ...state, result, error, pending };
            })
            .addCase(fetchBlogs.rejected.type, (state: BlogsState, action: ErrorAction<string, undefined>) => {
                const pending = false;
                const error: Error = { isError: true, message: action.error.message };

                return { ...state, error, pending };
            });
    }
});

const query = createSlice({
    name: 'blogsQuery',
    initialState: initialBlogsQueryState,
    reducers: {},
    extraReducers: (builder) =>
        builder
            .addCase(initialize.fulfilled.type, (state: BlogsSearchQuery, action: PayloadAction<AppState>) => {
                const filters = action.payload.appFilters;
                const managedTags: string[] = [];
                const blogCategories: string[] = [];
                let language: string = '';

                filters.blogs?.forEach((entry: BlogFiltersEntry) => {
                    if (entry.type === BlogFiltersEntryType.TAG) {
                        managedTags.push(entry.id);
                    }
                    if (entry.type === BlogFiltersEntryType.CATEGORY) {
                        blogCategories.push(entry.id);
                    }
                    if (entry.type === BlogFiltersEntryType.LANGUAGE) {
                        language = entry.id;
                    }
                });
                return { ...state, managedTags, blogCategories, language };
            })
            .addMatcher(blogsPageChanged.match, (state: BlogsSearchQuery, action: PayloadAction<number>): void => {
                state.page = action.payload;
            })
            .addMatcher(blogsManagedTagsAdd.match, (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                const currentTags: string[] = Object.assign([], state.managedTags);
                const newTag = action.payload;

                if (currentTags.length > 0) {
                    if (!currentTags.find((element: string) => element === newTag)) {
                        currentTags.push(newTag);
                    }
                } else {
                    currentTags.push(newTag);
                }
                state.managedTags = currentTags;
            })
            .addMatcher(
                blogsManagedTagsDelete.match,
                (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                    const currentTags = state.managedTags;
                    const oldTag = action.payload;

                    if (currentTags && currentTags.length > 0) {
                        const newTags = currentTags.filter((element: string) => element !== oldTag);
                        state.managedTags = newTags;
                    }
                }
            )
            .addMatcher(blogsManagedTagsDeleteAll.match, (state: BlogsSearchQuery): void => {
                state.managedTags = [];
            })
            .addMatcher(blogsLanguageUpdate.match, (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                state.language = action.payload;
            })
            .addMatcher(blogsOrderByUpdate.match, (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                state.orderBy = action.payload;
            })
            .addMatcher(blogsCategoryAdd.match, (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                const currentBlogsCaterories: string[] = Object.assign([], state.blogCategories);
                const newCategory = action.payload;

                if (currentBlogsCaterories.length > 0) {
                    if (!currentBlogsCaterories.find((element: string) => element === newCategory)) {
                        currentBlogsCaterories.push(newCategory);
                    }
                } else {
                    currentBlogsCaterories.push(newCategory);
                }

                state.blogCategories = currentBlogsCaterories;
            })
            .addMatcher(blogsCategoryDelete.match, (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                const currentBlogsCaterories: string[] = Object.assign([], state.blogCategories);
                const oldCategory = action.payload;

                if (currentBlogsCaterories.length > 0) {
                    const newCategories = currentBlogsCaterories.filter((element: string) => element !== oldCategory);
                    state.blogCategories = newCategories;
                }
            })
            .addMatcher(blogsCategoryDeleteAll.match, (state: BlogsSearchQuery): void => {
                state.blogCategories = [];
            })
            .addMatcher(
                blogsSearchTermChanged.match,
                (state: BlogsSearchQuery, action: PayloadAction<string>): void => {
                    state.page = 0;
                    state.searchTerm = action.payload;
                }
            )
});

const ui = createSlice({
    name: 'blogsUI',
    initialState: initialUiState,
    reducers: {},
    extraReducers: (builder) =>
        builder
            .addCase(initialize.fulfilled.type, (state: BlogsUiState, action: PayloadAction<AppState>) => {
                const filters = action.payload.appFilters;
                const filtersEntries = filters.blogs ?? [];
                return { ...state, filtersEntries };
            })
            .addMatcher(blogsFiltersSelected.match, (state: BlogsUiState, action: PayloadAction<boolean>): void => {
                const isOpened = action.payload;
                state.isFiltersMenuOpened = isOpened;
            })
            .addMatcher(blogsLoading.match, (state: BlogsUiState, action: PayloadAction<boolean>): void => {
                const isLoading = action.payload;
                state.isLoading = isLoading;
            })
            .addMatcher(
                blogsFilterEntryAdd.match,
                (state: BlogsUiState, action: PayloadAction<BlogFiltersEntry>): void => {
                    const currentFilters = state.filtersEntries;
                    const newFilter = action.payload;

                    if (currentFilters.length > 0) {
                        if (newFilter.type === BlogFiltersEntryType.LANGUAGE) {
                            const index = currentFilters.findIndex(
                                (element: BlogFiltersEntry) => element.type === BlogFiltersEntryType.LANGUAGE
                            );
                            if (index !== -1) {
                                currentFilters[index].id = newFilter.id;
                                currentFilters[index].label = newFilter.label;
                                state.filtersEntries = currentFilters;
                            } else {
                                currentFilters.push(newFilter);
                                state.filtersEntries = currentFilters;
                            }
                        } else if (!currentFilters.find((element: BlogFiltersEntry) => element.id === newFilter.id)) {
                            currentFilters.push(newFilter);
                            state.filtersEntries = currentFilters;
                        }
                    } else {
                        state.filtersEntries = [newFilter];
                    }
                }
            )
            .addMatcher(blogsFilterEntryDelete.match, (state: BlogsUiState, action: PayloadAction<string>): void => {
                const currentFilters = state.filtersEntries;

                if (currentFilters.length > 0) {
                    const newFilter = currentFilters.filter(
                        (element: BlogFiltersEntry) => element.id !== action.payload
                    );
                    state.filtersEntries = newFilter;
                }
            })
            .addMatcher(blogsFilterEntryDeleteAll.match, (state: BlogsUiState): void => {
                state.filtersEntries = [];
            })
});

export const initialState: Blogs = {
    result: initialSearchState,
    query: initialBlogsQueryState,
    ui: initialUiState
};

// State selectors
export const getBlogsResult = (state: RootState) => state.blogs.result.result;
export const getBlogsError = (state: RootState) => state.blogs.result.error;
export const getBlogsPending = (state: RootState) => state.blogs.result.pending;
export const getBlogsTotalCount = (state: RootState) => state.blogs.result.result.totalCount;

export const getBlogsUI = (state: RootState) => state.blogs.ui;
export const getBlogsUIIsLoading = (state: RootState) => state.blogs.ui.isLoading;
export const getBlogsUIFiltersEntries = (state: RootState) => state.blogs.ui.filtersEntries;

export const getBlogsQuery = (state: RootState): BlogsSearchQuery => state.blogs.query;
export const getManagedTags = (state: RootState): string[] | undefined => state.blogs.query.managedTags;
export const getBlogsLanguage = (state: RootState): string | undefined => state.blogs.query.language;
export const getBlogsCategories = (state: RootState): string[] | undefined => state.blogs.query.blogCategories;
export const getBlogsSearchTerm = (state: RootState): string | undefined => state.blogs.query.searchTerm;
export const getBlogsOrderBy = (state: RootState): string | undefined => state.blogs.query.orderBy;

export default combineReducers({
    result: result.reducer,
    query: query.reducer,
    ui: ui.reducer
});
