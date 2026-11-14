title=SQL
navorder=10
~~~~~~

# SQL in the browser

[TOC]

_Interactive SQL exercises: readers write queries against a sample database and see the result right away – no server, no installation._

Behind it is [PGlite](https://pglite.dev), a complete PostgreSQL compiled to WebAssembly that runs in the reader's browser. It is only loaded where it is needed: pages without an SQL block load nothing of it. Pages with an SQL block first load just a small control script; the database itself (a little over 4 MB) follows only when someone clicks into an SQL editor.

## Creating a database

A code block with the language `sql-db` holds the script that builds the database – i.e. `CREATE TABLE` and `INSERT`:

````
```sql-db
CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  VARCHAR(40) NOT NULL,
  city  VARCHAR(40)
);
INSERT INTO students VALUES
  (1001, 'Anna', 'Stuttgart'),
  (1002, 'Ben',  'Heidelberg'),
  …
```
````

On the page, the script appears as a collapsible listing so readers can look up tables and data:

```sql-db
CREATE TABLE students (
  id    INTEGER PRIMARY KEY,
  name  VARCHAR(40) NOT NULL,
  city  VARCHAR(40)
);
CREATE TABLE courses (
  course_id  INTEGER PRIMARY KEY,
  title      VARCHAR(60) NOT NULL,
  ects       INTEGER NOT NULL
);
CREATE TABLE enrolments (
  id         INTEGER REFERENCES students,
  course_id  INTEGER REFERENCES courses,
  grade      NUMERIC(2,1),
  PRIMARY KEY (id, course_id)
);
INSERT INTO students VALUES
  (1001, 'Anna',  'Stuttgart'),
  (1002, 'Ben',   'Heidelberg'),
  (1003, 'Clara', 'Stuttgart'),
  (1004, 'David', 'Ulm'),
  (1005, 'Emil',  NULL);
INSERT INTO courses VALUES
  (1, 'Databases', 5),
  (2, 'Programming', 8),
  (3, 'Statistics', 5);
INSERT INTO enrolments VALUES
  (1001, 1, 1.3), (1001, 2, 2.0), (1002, 1, 2.7),
  (1003, 1, 1.0), (1003, 3, 1.7), (1004, 2, NULL);
```

## Trying out queries

A block with the language `sql-query` becomes an editor. Its content is the initial query:

````
```sql-query
SELECT * FROM students;
```
````

Result – just click “Run” or press <kbd>Ctrl</kbd>+<kbd>Enter</kbd> in the editor:

```sql-query
SELECT * FROM students;
```

PostgreSQL reports errors in plain text, e.g. for a misspelled table name. Output is cut off after 200 rows.

## Exercises with a model solution

A line `solution:` is followed by a model solution. The block then compares every result with that of the solution and offers “Show solution”. `title:` gives the block a heading:

````
```sql-query
title: Exercise 1 – All students from Stuttgart, in alphabetical order
SELECT name FROM students;
solution:
SELECT name FROM students WHERE city = 'Stuttgart' ORDER BY name;
```
````

Result:

```sql-query
title: Exercise 1 – All students from Stuttgart, in alphabetical order
SELECT name FROM students;
solution:
SELECT name FROM students WHERE city = 'Stuttgart' ORDER BY name;
```

The initial query may also be empty:

```sql-query
title: Exercise 2 – Average grade per course title (only courses with grades)
solution:
SELECT c.title, AVG(e.grade)
FROM courses c JOIN enrolments e ON e.course_id = c.course_id
WHERE e.grade IS NOT NULL
GROUP BY c.title;
```

How the comparison works:

- The **last result table** of the query is compared with that of the model solution.
- The **number of columns** and the **rows** must match, the column names need not – `AVG(grade) AS mean` is just as correct.
- The **order** only counts if the model solution ends with `ORDER BY`. If the rows are right but their order is not, the feedback says so.
- Numbers are compared numerically: `2`, `2.0` and `2.0000` are equal.

## Changing data

`INSERT`, `UPDATE`, `DELETE` and even `CREATE TABLE` are allowed. Every run happens in a transaction of its own that is rolled back afterwards. So the change takes effect within the same run; afterwards the database is back in its initial state – for this block and all others on the page:

```sql-query
UPDATE enrolments SET grade = 1.0 WHERE id = 1002;
SELECT s.name, e.course_id, e.grade
FROM students s JOIN enrolments e ON e.id = s.id
WHERE s.id = 1002;
```

## Several databases

`name:` in the first line gives a database a name; `db:` selects it in an editor. Without either, the unnamed default database is used. Several `sql-db` blocks with the same name are concatenated in document order – handy for explaining a schema step by step.

````
```sql-db
name: stock
show: none
CREATE TABLE items (nr INTEGER, quantity INTEGER);
INSERT INTO items VALUES (1, 12), (2, 0), (3, 5);
```

```sql-query
db: stock
SELECT * FROM items WHERE quantity = 0;
```
````

`show: none` hides the script completely, `show: open` shows it expanded. Result (the script stays invisible here):

```sql-db
name: stock
show: none
CREATE TABLE items (nr INTEGER, quantity INTEGER);
INSERT INTO items VALUES (1, 12), (2, 0), (3, 5);
```

```sql-query
db: stock
SELECT * FROM items WHERE quantity = 0;
```

## Structure

| Block / header line | Meaning |
|---------------------|---------|
| ` ```sql-db ` | script that builds a database; shown as a collapsible listing |
| `name: …` | name of the database (optional, before the script) |
| `show: open` / `show: none` | show the listing expanded, or hide it completely |
| ` ```sql-query ` | editor; the content is the initial query |
| `db: …` | database to use (optional, before the query) |
| `title: …` | heading of the editor (optional, before the query) |
| `solution:` | a line of its own; the model solution follows |

## Notes

- It runs **PostgreSQL**. Standard SQL works as expected; error messages are PostgreSQL's own.
- SQL blocks need a **web server**; browsers do not load WebAssembly modules via `file://`. Locally, `python3 -m http.server` in `target/website` is enough. Anyone opening the page as a file gets a corresponding hint in the block.
- The first start takes a few seconds depending on the connection. After that, PGlite sits in the browser cache. The web server should compress `.wasm` and `.data` files (with Apache e.g. via `mod_deflate`); then it is a little over 4 instead of 16 MB.
- A query that never ends (such as a huge cross product) blocks the reader's browser tab until they reload it. Other readers are not affected.
- As with the quiz, the model solution is part of the page source – the blocks are meant for **self-checking**.
- The labels follow the page language. A site can change them via UI strings with the prefix `sql.`, e.g. `sql.run` or `sql.ok`.
