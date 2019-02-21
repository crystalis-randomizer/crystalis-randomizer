# Satisfied requirements and solved fillings

Consider a system with $N$ boolean key items $k_1, \ldots, k_N$
and $M > N$ locations $l_1, \ldots, l_M$, where each location
$l_j$ has a requirement $R(l_j)$ expressible as a boolean
expression on the key items.  For example,

$$
R(l_1) = (k_1 \land k_2 \land k_4) \lor (k_3 \land k_5).
$$

A requirement can be *satisfied* by a subset
$A = \{k_{a_1}, \ldots, k_{a_J}\}$ of key items,

$$
\left.R(l_j)\right|_A,
$$

provided that there exists a disjunct
$(k_{b_1} \land \cdots \land k_{b_K})$
with all $k_{b_i} \in A$.

Define a *filling* as a mapping $f: \mathbb{Z}_N \to \mathbb{Z}_M$
such that the item $k_i$ is found in location $l_{f(i)}$.

A filling $f$ is *solvable* if there exists a sequence
$k_{a_1}, \ldots, k_{a_N}$, such that for all
$i \in \mathbb{Z}_N$, the requirement $R(l_{f(i)})$ is satisfied
by the subset $\{k_{a_1}, \ldots, k_{a_i}\}$.


# Assumed fill

Define a *partial filling* as a mapping $f_n$ from a subset of
$n < N$ key items to locations.  We say $k_i \in f_n$ if
$f_n$ maps $k_i$ to a location.  A requirement $R(l_j)$ is satisfied
by a subset of items $K' \subseteq K$ and a partial filling $f_n$ if
there exists an ordering
$k_{a_1}, \ldots, k_{a_N'}$ of $K'' \subseteq K - K'$ such that
for all $i$, $R(l_{f_n(k_{a_i})})$ is satisfied by
$K' \cup \{k_{a_1}, \ldots, k_{a_{i-1}}\}$.

Now consider the following algorithm to generate a filling $f$ given
a set $K$ of key items and a set $L$ of locations with requirements
$R$.  We build up a sequence of partial fillings $f_1, \ldots f_N$
as follows: for each $i$, choose a random item
$k_i \in K_i$ where $K_i = K - \{k_1, \ldots, k_{i-1}\}$.
This leaves a subset of locations

$$
L_i = \left\{l \in L : \left.R(l)\right|_{K_if_i}\right\}
$$

that are reachable by all remaining key items under the partial
filling.  Choose a random location $l_i \in L_i$ and set the
partial filling $f_i(k_i) = l_i$.  Repeat until all key items
are filled, aborting if any $L_i$ is empty.

**Theorem 1**: If all items are successfully placed, then the result
is a solvable filling.

**Lemma 2**: Under an assumed filling $f$, the requirement
$R(l_{f(i)})$ is satisfied by the set of items
$\{k_{i+1}, \ldots, k_N\}$.

**Proof**: Begin with the last placement, $i = N$, as a base case.
The item $k_N$ is placed at a location $l_{f(N)}$ that is reachable
under $f$ with no items.  Inductively, for any $i < N$, given that
all $i' > i$ are reachable, then by the placement rules, $i$ is
reachable, too.


# Multiple copies of single-use items

The preceding logic becomes slightly more difficult if multiple
identical copies of the same item are available.  In particular,
suppose $k_1 = k_2$ are placed at $l_1$ and $l_2$, and $k_3$ and
$k_4$ are placed at $l_3$ and $l_4$, respectively, with
requirements $R(l_1) = \emptyset$, $R(l_2) = k_3$, and
$R(l_3) = R(l_4) = k_1$.  If the player uses the $k_1$ from location
$l_1$ to open $l_4$ then item $k_3$ is now permanently locked.

TODO: figure out the exact criteria we need to check for!
