export const DEFAULT_DEMO_CODE = `
import { makeQueryLoader, buildView, sql } from 'slonik-trpc';
import { z } from 'zod';

const postsView = buildView\`
FROM users
LEFT JOIN posts
    ON posts.author = users.id\`
// Allows filtering posts.title: { _ilike: '%hello%' }
.addStringFilter('posts.title')
// Allows filter id: [1, 2, 3]
.addInArrayFilter('id', sql.fragment\`posts.id\`, 'numeric')
.addDateFilter('createdDate', sql.fragment\`posts.created_at\`)
.addComparisonFilter('postLength', sql.fragment\`LENGTH(posts.text)\`)


const post = z.object({
    id: z.string(),
    author: z.string(),
    text: z.string(),
    age: z.number(),
});

const postsQuery = sql.type(post)\`
SELECT "posts".id
  , "users"."firstName" || ' ' || "users"."lastName" AS "author"
  , "posts"."text"
  , EXTRACT(DAYS FROM NOW() - posts."created_at") AS "age"
\`;

export const postsLoader = makeQueryLoader({
    query: {
        select: postsQuery,
        view: postsView,
    },
    defaults: {
        orderBy: [["id", "ASC"]],
        take: 25,
    },
    options: {
        orFilterEnabled: true,
    },
    sortableColumns: {
        id: ["posts", "id"],
        name: sql.fragment\`users."firstName" || users."lastName"\`,
        // Can reference FROM tables when using raw sql fragments
        createdAt: ["posts", "created_at"],
    },
});

postsLoader.loadPagination({
    where: {
        createdDate: {
            _gte: "2023-01-01"
        },
        // Only gets posts after 2023-01-01, shorter than 100k characters
        postLength: {
            _lt: 100000
        },
    },
    // Ordered by author's name + createdAt
    orderBy: [["name", "ASC"], ["createdAt", "DESC"]],
    // Only takes these fields (the rest aren't queried)
    select: ["id", "author", "age"],
    // Takes the total count of posts (useful when paginating because only 25 are returned by default)
    takeCount: true,
});

// Views can be queried directly for faster access (without having to create a loader, yet getting access to all the filters)
const specificPosts = postsView.load({
    select: sql.fragment\`SELECT posts.title, posts.text\`,
    where: {
        id: [123]
    },
});

`;
