title=Algorithm animations
navorder=12
~~~~~~

# Algorithm animations

[TOC]

_Sorting, searching and pathfinding as step-by-step animations: readers click through (or play) what the algorithm does – which elements are compared, swapped or visited._

An `algo-viz` block only holds the **input**. The algorithm itself is built in (`js/algoviz-algos.js`) and runs in the reader's browser, so there is nothing to compute at build time and no library to load: pages without such a block load nothing of it. Below the picture there are **Back / Next / Play** buttons and a speed slider; in slide mode the **arrow keys** step through the animation before moving on to the next slide. Nothing plays by itself.

## Sorting

````
```algo-viz
title: Bubble sort
algo: bubble-sort
data: 5, 2, 9, 1, 7, 3
```
````

```algo-viz
title: Bubble sort
algo: bubble-sort
data: 5, 2, 9, 1, 7, 3
```

- `algo:` is one of `bubble-sort`, `selection-sort`, `insertion-sort`, `merge-sort`, `quick-sort`.
- `data:` takes up to 30 whole numbers from 0 to 999 (separated by commas or spaces). `random: 8` gives 8 values instead – always the same ones, so the slide never changes.
- Orange bars are being swapped, blue ones compared, green ones are in their final place. The note under the picture always says in words what happens, and the counters show comparisons and swaps.

<div class="nextpage"></div>

## Quick sort and merge sort

```algo-viz
title: Quick sort (the outlined bar is the pivot)
algo: quick-sort
data: 5, 2, 9, 1, 7, 3, 8, 4
```

```algo-viz
title: Merge sort (the row below shows the merge buffer)
algo: merge-sort
data: 6, 3, 8, 1, 9, 2, 7, 4
```

<div class="nextpage"></div>

## Searching

```algo-viz
title: Binary search for 23
algo: binary-search
data: 2, 5, 8, 12, 16, 23, 31, 40
target: 23
```

`linear-search` and `binary-search` need `target:`. The pointers `lo`, `mid` and `hi` are drawn under the bars, bars outside the current search range fade out. Binary search needs sorted data – unsorted input is sorted first, and the page says so.

<div class="nextpage"></div>

## Pathfinding on a grid

````
```algo-viz
title: A* on a map
algo: astar
grid:
S..#....
.#.#.##.
.#...#G.
...###..
```
````

```algo-viz
title: Breadth-first search
algo: bfs
grid:
S..#....
.#.#.##.
.#...#G.
...###..
```

```algo-viz
title: A* with terrain costs (the digits are the cost of entering a cell)
algo: astar
grid:
S...#...
.##.#.#.
.#2.2.#G
.#2###..
...3....
```

- `algo:` is `bfs`, `dfs`, `dijkstra` or `astar`.
- Below `grid:` each character is a cell: `S` start, `G` goal, `#` wall, `.` free, and a digit from `2` to `9` is the cost of entering that cell (used by `dijkstra` and `astar`; `bfs` and `dfs` count every step as 1). A grid can be up to 40 × 25 cells.
- Light blue with a frame: discovered but not yet visited. Mid blue: visited. Orange: the cell being visited now. Green: the final path. The numbers on visited cells are the cost of the best way found so far.

<div class="nextpage"></div>

## Graphs with weights

````
```algo-viz
title: Dijkstra from A to D
algo: dijkstra
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```
````

```algo-viz
title: Dijkstra from A to D
algo: dijkstra
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```

- Below `graph:`, `A 0,0` defines a node (name and position on the picture) and `A-B 4` an undirected edge with its weight (1 if left out). Up to 26 nodes.
- `start:` is required; without `goal:` the search runs until every reachable node has been visited.
- `bfs`, `dfs` and `dijkstra` work on graphs (`astar` needs a grid). `bfs` and `dfs` ignore the weights.
- Mistakes in the input (an unknown algorithm, a grid without `S` or `G`, …) do not break the build: the block shows a message instead of the picture.

<div class="nextpage"></div>

## More algorithms

The remaining algorithms work exactly like the ones above.

```algo-viz
title: Selection sort (the pointer `min` marks the smallest element found so far)
algo: selection-sort
data: 5, 2, 9, 1, 7, 3
```

```algo-viz
title: Insertion sort (each new element moves left until it fits)
algo: insertion-sort
data: 5, 2, 9, 1, 7, 3
```

<div class="nextpage"></div>

```algo-viz
title: Linear search for 15
algo: linear-search
data: 4, 8, 15, 16, 23
target: 15
```

```algo-viz
title: Depth-first search – finds a path, but not necessarily the shortest
algo: dfs
grid:
S..#....
.#.#.##.
.#...#G.
...###..
```

<div class="nextpage"></div>

```algo-viz
title: Breadth-first search on a graph (the weights are ignored, every edge counts as 1)
algo: bfs
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```

```algo-viz
title: Depth-first search on a graph
algo: dfs
start: A
goal: D
graph:
A 0,0
B 2,0
C 1,2
D 3,2
A-B 4
A-C 2
B-D 5
C-D 8
C-B 1
```

<div class="nextpage"></div>

## Picture and code together

The animation shows a built-in *reference implementation*, not the Java code on your slide. That is deliberate: you only type the input, and you can show the animation **before** the code (what should happen?) and the code afterwards (how does it work?).

If you want the picture and the highlighted code line to **always match**, add `viz:` to a `java-steps` block (see [Java step by step](java.md)): it draws an array variable as bars and index variables as pointers, taken from the variable values of each step.

````
```java-steps
title: Binary search
viz: a (lo, hi, mid)
java:
...
step: - | 4 | Look at the middle element. | a=[2, 5, 8, 12, 16, 23]; lo=0; hi=5
```
````

`viz: a (lo, hi, mid)` means: draw the array `a`, and mark the positions held by `lo`, `hi` and `mid`. Cells whose value changed since the previous step are orange. The values come from the `step:` lines, so with hand-written steps the picture is exactly as right as the numbers you typed.

```java-steps
title: Binary search for 16
viz: a (lo, hi, mid)
java:
int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1;
        else hi = mid - 1;
    }
    return -1;
}
step: - | 2 | The search range is the whole array. | a=[2, 5, 8, 12, 16, 23]; target=16
step: - | 3 | `lo <= hi`: is anything left to search? | a=[2, 5, 8, 12, 16, 23]; target=16; lo=0; hi=5
step: - | 4 | Look at the middle element. | a=[2, 5, 8, 12, 16, 23]; target=16; lo=0; hi=5
step: - | 5 | `a[2] = 8` is not 16. | a=[2, 5, 8, 12, 16, 23]; target=16; lo=0; hi=5; mid=2
step: - | 6 | `8 < 16`: the lower bound moves up. | a=[2, 5, 8, 12, 16, 23]; target=16; lo=0; hi=5; mid=2
step: - | 3 | Still something left to search. | a=[2, 5, 8, 12, 16, 23]; target=16; lo=3; hi=5
step: - | 4 | New middle: `(3 + 5) / 2 = 4`. | a=[2, 5, 8, 12, 16, 23]; target=16; lo=3; hi=5
step: - | 5 | `a[4] = 16`: found, return `4`. | a=[2, 5, 8, 12, 16, 23]; target=16; lo=3; hi=5; mid=4
```
