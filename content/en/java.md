title=Java step by step
navorder=11
~~~~~~

# Java step by step

[TOC]

_Walk through an algorithm line by line: Java and pseudocode side by side, the current lines highlighted, with an explanation and the variable values for every step._

The `java-steps` block needs no extra library: the code is coloured by the bundled highlight.js, and a small script (`js/javasteps.js`, loaded only on pages with such a block) highlights the lines of the current step. In slide mode the **arrow keys** first step through the code on the current slide and only then move on to the next slide.

## Writing a block

````
```java-steps
title: Linear search
pseudo:
LinearSearch(A, target)
  for i = 0 to length(A) - 1
    if A[i] = target
      return i
  return -1
java:
int linearSearch(int[] a, int target) {
    for (int i = 0; i < a.length; i++) {
        …
step: 1 | 1 | The call starts. | a=[4, 8, 15, 16]; target=15
step: 2 | 2 | The loop starts with `i = 0`. | i=0
```
````

- `title:` is optional and comes first.
- `pseudo:` (optional) and `java:` start the two code sections. The code is shown as written, indentation included, until the next section or the first `step:`. Without `pseudo:` only the Java code is shown.
- `step: P | J | explanation | variables` is one step. `P` and `J` are the lines to highlight in the pseudocode and in the Java code (counted from 1): `2`, `2,3` or `2-4`; leave empty for none. In the explanation, `**bold**` and `` `code` `` work.
- `variables` is optional: `name=value` pairs separated by `;`. Values that changed since the previous step are marked.

<div class="nextpage"></div>

## Example: linear search

```java-steps
title: Linear search for 15 in [4, 8, 15, 16]
pseudo:
LinearSearch(A, target)
  for i = 0 to length(A) - 1
    if A[i] = target
      return i
  return -1
java:
int linearSearch(int[] a, int target) {
    for (int i = 0; i < a.length; i++) {
        if (a[i] == target) {
            return i;
        }
    }
    return -1;
}
step: 1 | 1 | The method is called with the array `a` and the value we are looking for. | a=[4, 8, 15, 16]; target=15
step: 2 | 2 | The loop starts with the first index, `i = 0`. | i=0
step: 3 | 3 | Compare `a[0] = 4` with `target = 15`: not equal, so the loop goes on. | i=0; a[i]=4
step: 2 | 2 | Next index: `i = 1`. | i=1
step: 3 | 3 | `a[1] = 8` is not 15 either. | i=1; a[i]=8
step: 2 | 2 | Next index: `i = 2`. | i=2
step: 3 | 3 | `a[2] = 15` equals `target`: the condition is true. | i=2; a[i]=15
step: 4 | 4 | **Found:** the method returns the index `2`. | i=2; result=2
```

<div class="nextpage"></div>

## Example: binary search

```java-steps
title: Binary search for 16 in the sorted array [2, 5, 8, 12, 16, 23]
pseudo:
BinarySearch(A, target)
  lo = 0; hi = length(A) - 1
  while lo <= hi
    mid = floor((lo + hi) / 2)
    if A[mid] = target: return mid
    if A[mid] < target: lo = mid + 1
    else: hi = mid - 1
  return -1
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
step: 2 | 2 | The search range is the whole array. | lo=0; hi=5
step: 3 | 3 | `lo <= hi`, so there is still something to search. | lo=0; hi=5
step: 4 | 4 | Look at the middle element. | lo=0; hi=5; mid=2
step: 5 | 5 | `a[2] = 8` is not 16. | lo=0; hi=5; mid=2
step: 6 | 6 | `8 < 16`: the target must be to the right, so the lower bound moves up. | lo=3; hi=5; mid=2
step: 3 | 3 | `3 <= 5`: the range is not empty. | lo=3; hi=5; mid=2
step: 4 | 4 | New middle: `(3 + 5) / 2 = 4`. | lo=3; hi=5; mid=4
step: 5 | 5 | `a[4] = 16` is the value we want: **found**, return `4`. | lo=3; hi=5; mid=4; result=4
```
