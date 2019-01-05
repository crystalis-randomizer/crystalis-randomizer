# Rebalance sword damage
# Calculate expected sword damage by difficulty level
# Monte Carlo approach

from random import shuffle
#from itertools import xrange

DMG = [4,6,10]

def order(xs):
  out = [4]
  found = [-1, -1, -1, -1]
  most = 0
  for x in xs:
    x = int(x / 3)
    if x < 3:
      found[x] += 1
      most = max(most, found[x])
    out.append(DMG[most])
  return out

def mc(n=100000):
  items = range(49)
  total = [0 for x in range(len(items) + 1)]
  for i in xrange(n):
    shuffle(items)
    out = order(items)
    for j in range(len(items) + 1):
      total[j] += out[j]
  return [float(x) / n for x in total]

print '\n'.join([str(x) for x in mc()])
