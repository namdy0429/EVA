class Entity:
    def __init__(self, name):
        self.name = name
        self.titles = []
        self.descs = []
        self.labels = []
        self.change = 0
        self.issue_ids = []

    def add_issue(self, title, desc, label):
        self.title.append(title)
        self.descs.append(desc)
        self.labels.append(label)



class Cluster:
    """Cluster is the representation of the components in a system"""

    def __init__(self, label):
        self.label = label
        self.classes = []
        self.entities = []
        self.change = 0
        self.sorting_num = 0

    def add_class(self, class_name):
        self.classes.append(class_name)
        self.entities.append(Entity(class_name))

    def add_dummy_class(self, dummy):
        self.classes.append("")
        dummy_entity = Entity(dummy)
        dummy_entity.change = -1
        self.entities.append(dummy_entity)            

    def add_multi_dummy_class(self, num):
        for i in range(num):
            self.classes.append("")
            dummy_entity = Entity("dummy")
            dummy_entity.change = -1
            self.entities.append(dummy_entity)     

    def set_sorting_num(self, sorting_num):
        self.sorting_num = sorting_num


class Architecture:
    """Represents the classes in a system"""

    def __init__(self, label, target_sub, is_component_arch):
        self.label = label
        self.clusters = []
        self.classes = []
        self.target_sub = target_sub
        self.is_component_arch = is_component_arch

    def load_architecture(self, rsf_file_path, deps_file_path=''):
        self.load_clusters(rsf_file_path)
        # read line by line
        # create the Cluster
        # add classes to cluster
        # append Cluster to Architecture
        # =============================
        # read the dependencies
        # find containing Cluster
        # add class pair

    def load_clusters(self, rsf_file_path):
        with open(rsf_file_path) as f:
            content = f.readlines()
            content.sort()
            for line in content:
                if "/" in line:
                    line = line.replace("/", ".")
                (d, label, class_name) = line.split()
                if self.is_component_arch:
                    if self.target_sub not in label:
                        continue
                else:
                    if self.target_sub not in class_name:
                        continue
                if len(self.clusters) == 0 or self.clusters[-1].label != label:
                    c = Cluster(label)
                    c.add_class(class_name)
                    self.clusters.append(c)
                else:
                    self.clusters[-1].add_class(class_name)
            # print (len(self.clusters))
            # print (self.clusters[0].label, self.clusters[0].classes)

    def add_dummy_cluster(self, dummy):
        c = Cluster(dummy)
        c.change = -1
        self.clusters.append(c)

    def load_connectors(self, deps_file_path):
        pass

    def sort(self):
        self.clusters.sort(key=lambda x: x.label)
        for cluster in self.clusters:
            cluster.classes.sort()
        return self

    def generate_class_list(self):
        class_set = set()
        for c in self.clusters:
            class_set.update(c.classes)
        self.classes = list(class_set)

def main():
    print ("s")


if __name__ == "__main__":
    main()