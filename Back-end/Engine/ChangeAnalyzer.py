from __future__ import print_function

import json

from enum import Enum
from ortools.graph import pywrapgraph


class ChangeType(Enum):
    AddedCluster = 1
    RemovedCluster = 2
    ModifiedCluster = 3
    AddedClass = 4
    RemovedClass = 5
    MovedClass = 6

    def __int__(self):
        return self.value


class Change:
    """Represent the diff between two architectures"""

    def __init__(self, change_type, cluster_label, issues, added_classes, removed_classes):
        self.changeType = change_type
        self.clusterLabel = cluster_label
        self.issues = issues
        self.addedElements = added_classes
        self.removedElements = removed_classes

    def is_empty(self):
        return not (self.addedElements or self.removedElements)


def convert_changes_to_json(changes):
    json_converted = []
    for change in changes:
        c = {'name': change.clusterLabel.replace(".ss", ""), "type": int(change.changeType.value), 'children': []}
        for child in change.addedElements:
            c["children"].append(
                # {"name": child.replace(change.clusterLabel.replace(".ss", ""), ""), "type": int(ChangeType.AddedClass)})
                {"name": child, "type": int(ChangeType.AddedClass)})
        for child in change.removedElements:
            # c["children"].append({"name": child.replace(change.clusterLabel.replace(".ss", ""), ""),
            c["children"].append({"name": child,
                                  "type": int(ChangeType.RemovedClass)})
        json_converted.append(c)

    return json.dumps({"name": "root", "children": json_converted})


def get_architectural_change(first_arch, second_arch, reverse = False):
    """Returns the list of changes between two architectures"""
    return get_architectural_change_by_flow(first_arch, second_arch, reverse)


def get_architectural_change_by_flow(first_arch, second_arch, reverse):
    changes = []
    i = 1
    for (clusterA, clusterB) in get_matched_by_flow_clusters(first_arch, second_arch):
        if clusterA.sorting_num == 0 and clusterB.sorting_num == 0:
            clusterA.set_sorting_num(i)
            clusterB.set_sorting_num(i)
            i += 1
        elif clusterA.sorting_num == 0 and clusterB.sorting_num > 0:
            clusterA.set_sorting_num(clusterB.sorting_num)
        elif clusterB.sorting_num == 0 and clusterA.sorting_num > 0:
            clusterB.set_sorting_num(clusterA.sorting_num)
        removed_classes = get_removed_classes(clusterA, clusterB, reverse)
        added_classes = get_added_classes(clusterA, clusterB, reverse)
        if removed_classes or added_classes:
            c = Change(ChangeType.ModifiedCluster, clusterA.label, None, added_classes, removed_classes)
            changes.append(c)
    return changes


def get_matching_clusters(first_arch, second_arch):
    for clusterA in first_arch.clusters:
        for clusterB in second_arch.clusters:
            if clusterA.label == clusterB.label:
                yield (clusterA, clusterB)
                break


def get_matched_by_flow_clusters(first_arch, second_arch):
    first_clusters_labels = dict()
    second_clusters_labels = dict()
    lenA = len(first_arch.clusters)
    lenB = len(second_arch.clusters)
    while lenA > lenB:
        second_arch.add_dummy_cluster("dummy")
        lenB += 1
    while lenA < lenB:
        first_arch.add_dummy_cluster("dummy")
        lenA += 1

    i = 1
    for clusterA in first_arch.clusters:
        first_clusters_labels[i] = clusterA
        i = i + 1
    for clusterB in second_arch.clusters:
        second_clusters_labels[i] = clusterB
        i = i + 1

    min_cost_flow = pywrapgraph.SimpleMinCostFlow()

    for start, c1 in first_clusters_labels.items():
        for end, c2 in second_clusters_labels.items():
            c1_set = set(c1.classes)
            c2_set = set(c2.classes)
            cost = len(c1_set.union(c2_set) - c1_set.intersection(c2_set))
            min_cost_flow.AddArcWithCapacityAndUnitCost(start, end,
                                                        1, cost)
    for start in first_clusters_labels:
        min_cost_flow.AddArcWithCapacityAndUnitCost(0, start,
                                                    1, 0)
    for start in second_clusters_labels:
        min_cost_flow.AddArcWithCapacityAndUnitCost(start, i + 1, 1, 0)

    min_cost_flow.SetNodeSupply(0, len(first_clusters_labels))
    min_cost_flow.SetNodeSupply(i + 1, -len(second_clusters_labels))

    matched_clusters = []
    if min_cost_flow.Solve() == min_cost_flow.OPTIMAL:
        print('Minimum cost:', min_cost_flow.OptimalCost())
        print('')
        # print(' Edge    Flow / Capacity  Cost')
        for i in range(min_cost_flow.NumArcs()):
            cost = min_cost_flow.Flow(i) * min_cost_flow.UnitCost(i)

            if cost != 0:
                # print('%1s -> %1s   %3s  / %3s       %3s' % (
                #     min_cost_flow.Tail(i),
                #     min_cost_flow.Head(i),
                #     min_cost_flow.Flow(i),
                #     min_cost_flow.Capacity(i),
                #     cost))

                head_index = min_cost_flow.Head(i)
                tail_index = min_cost_flow.Tail(i)
                matched_clusters.append(
                    (first_clusters_labels[tail_index], second_clusters_labels[head_index]))
    else:
        print('There was an issue with the min cost flow input.')

    return matched_clusters


def get_removed_clusters(first_arch, second_arch, removed = True):
    clusters = []
    for clusterA in first_arch.clusters:
        flag = False
        for clusterB in second_arch.clusters:
            if clusterA.label == clusterB.label:
                flag = True
        if not flag:
            clusters.append(clusterA)
            if removed:
                clusterA.change = 2
                # clusterB.add_multi_dummy_class(len(clusterA.classes))
            else:
                clusterA.change = 1
                # clusterB.add_multi_dummy_class(len(clusterA.classes))
    return clusters


def get_added_clusters(first_arch, second_arch):
    return get_removed_clusters(second_arch, first_arch, False)


def get_removed_classes(first_cluster, second_cluster, reverse = False, removed = True):
    elements = []
    # print(first_cluster.label)
    # print(second_cluster.label)
    # print()
    for idx in range(len(first_cluster.classes)):
        elementA = first_cluster.classes[idx]
        flag = False
        for elementB in second_cluster.classes:
            if elementA == elementB:
                flag = True
        if not flag:
            elements.append(first_cluster.entities[idx])
            if removed:
                if first_cluster.entities[idx].change != -1:
                    if not reverse:
                        first_cluster.entities[idx].change = 5
                    # second_cluster.add_dummy_class("dummy_"+first_cluster.entities[idx].name)
            else:
                if first_cluster.entities[idx].change != -1:
                    if not reverse:
                        first_cluster.entities[idx].change = 4
                    second_cluster.add_dummy_class("dummy_"+first_cluster.entities[idx].name)
    if len(elements) > 0 and first_cluster.change != -1:
        first_cluster.change = 3
    return elements


def get_added_classes(first_cluster, second_cluster, reverse = False):
    return get_removed_classes(second_cluster, first_cluster, reverse, False)


def main():
    """MinCostFlow simple interface example."""

    # Define four parallel arrays: start_nodes, end_nodes, capacities, and unit costs
    # between each pair. For instance, the arc from node 0 to node 1 has a
    # capacity of 15 and a unit cost of 4.

    start_nodes = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 5, 6]
    end_nodes = [1, 2, 3, 4, 5, 6, 4, 5, 6, 4, 5, 6, 7, 7, 7]
    capacities = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
    unit_costs = [0, 0, 0, 1, 6, 4, 5, 2, 2, 4, 3, 1, 0, 0, 0]

    # Define an array of supplies at each node.

    supplies = [20, 0, 0, -5, -15]

    # Instantiate a SimpleMinCostFlow solver.
    min_cost_flow = pywrapgraph.SimpleMinCostFlow()

    # Add each arc.
    for i in range(0, len(start_nodes)):
        min_cost_flow.AddArcWithCapacityAndUnitCost(start_nodes[i], end_nodes[i],
                                                    capacities[i], unit_costs[i])

    # Add node supplies.

    for i in range(1, 6):
        min_cost_flow.SetNodeSupply(i, 0)
    min_cost_flow.SetNodeSupply(0, 3)
    min_cost_flow.SetNodeSupply(7, -3)

    # Find the minimum cost flow between node 0 and node 4.
    if min_cost_flow.Solve() == min_cost_flow.OPTIMAL:
        print('Minimum cost:', min_cost_flow.OptimalCost())
        print('')
        print(' Edge    Flow / Capacity  Cost')
        for i in range(min_cost_flow.NumArcs()):
            cost = min_cost_flow.Flow(i) * min_cost_flow.UnitCost(i)
            print('%1s -> %1s   %3s  / %3s       %3s' % (
                min_cost_flow.Tail(i),
                min_cost_flow.Head(i),
                min_cost_flow.Flow(i),
                min_cost_flow.Capacity(i),
                cost))
    else:
        print('There was an issue with the min cost flow input.')


if __name__ == '__main__':
    main()