# sql-api-engine

## 0.2.6

### Patch Changes

- ad80f4d: Added ctx in buildView
- 46a448d: Added setAggregate function in buildView to support grouping by

## 0.2.5

### Patch Changes

- fe2bc72: Added preselected columns to buildView load

## 0.2.4

### Patch Changes

- 204ed99: Added the load method in buildView for quickly loading data

## 0.2.3

### Patch Changes

- 8e857a5: Allowing WITH CTE to be used in select

## 0.2.1

### Patch Changes

- dd71bd4: Changed sqlWith API to be backwards compatible

## 0.2.0

### Minor Changes

- 1b5d186: Changed `sqlWith` API to specify actual fragment names and remove functions.

## 0.1.6

### Patch Changes

- dc55e39: Added count query loader

## 0.1.5

### Patch Changes

- 9e29778: Added virtual field loaders. These are meant to allow efficient loading of data, for multiple rows at once.
  Instead of fetching data in the virtual field resolver, one row at a time, you can use a virtual field loader, and then have access to the data in the 3rd argument of the resolver.

  ```ts
  virtualFieldLoaders: {
      posts: async (rows) => {
          const allPosts = await fetchPostsForAuthors(rows.map(row => row.id));
          return allPosts;
      },
  },
  virtualFields: {
      posts: {
          dependencies: ["id"],
          resolve: (row, args, posts) => {
              return posts.filter(post => post.authorId = row.id)
          }
      }
  },
  ```

## 0.1.2

### Patch Changes

- cf0919f: Added composite views with getFilters

## 0.1.1

### Patch Changes

- 152957b: Fixed filtering types
