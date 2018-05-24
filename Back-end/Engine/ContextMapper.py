# TODO
# multiple issue mapping issue

import json, operator, sys
import os
from datetime import datetime
import dateutil.parser
from Architecture import Architecture
from utils import getPairwiseComparison
import glob
from os import walk
from os.path import join
import pickle

def ContextMapper(software_name, file_names, recovery_name = 'acdc', target_sub = '', is_component_arch = False):
	cur_dir = "/".join(os.getcwd().split("/")[:-1])

	with open(cur_dir + "/Data/Issues/" + software_name + "/labeled_issues.json") as json_data:
		issue_data = json.load(json_data)

	release_dic = issue_data['releases']
	del issue_data['releases']

	architectures = []
	for file in file_names:
		if recovery_name == 'relax':
			label = file.split('_'+ recovery_name)[0].split(software_name+'_')[1]
		elif recovery_name == 'acdc':
			print file.split('_' + recovery_name)[0]
			label = file.split('_'+ recovery_name)[0].split(software_name+'-')[1]
		elif recovery_name == 'arc':
			label = "_".join(file.split('_topics')[0].split(software_name+'-')[1].split("_")[:-1])
		else:
			label = file.split('_'+ recovery_name)[0].split(software_name+'-')[1]
		arch = Architecture(label, target_sub, is_component_arch)
		arch.load_architecture(join(cur_dir, "Data", "Architecture", software_name, recovery_name, file))
		architectures.append(arch.sort())

	# architectures = []
	# for file in file_names:
	# 	if recovery_name == 'relax':
	# 		label = file.split('_'+ recovery_name)[0].split(software_name+'_')[1]
	# 	elif recovery_name == 'acdc':
	# 		label = file.split('_'+ recovery_name)[0].split(software_name+'-')[1]
	# 	elif recovery_name == 'arc':
	# 		label = file.split('_topics')[0].split(software_name+'-')[1].split("_")[0]
	# 	else:
	# 		label = file.split('_'+ recovery_name)[0].split(software_name+'-')[1]
	# 	arch = Architecture(label)
	# 	arch.load_architecture(join(cur_dir, "Data", "Architecture", software_name, recovery_name, file))
	# 	architectures.append(arch.sort())

	recovered_versions = []
	for v in architectures:
		recovered_versions.append(v.label)

	for r in release_dic.keys():
		release_dic[r] = dateutil.parser.parse(release_dic[r])

	release_dic[u'v18.0'] 	  = datetime(2014, 8, 25)
	release_dic[u'v19.0'] 	  = datetime(2015, 12, 9)

	for ik in issue_data.keys():
		issue_data[ik]['fixed_time'] = dateutil.parser.parse(issue_data[ik]['fixed_time'])
		dot_filenames = []
		for f in issue_data[ik]['files']:
			dot_filenames.append('.'.join(f.split('.java')[0].split('/')))
		issue_data[ik]['files'] = dot_filenames

	versioned_issues = {}
	for ik in issue_data.keys():
		fixed_time = datetime(1000, 1, 1)
		for v in recovered_versions:
			if fixed_time < release_dic[v] and release_dic[v] < issue_data[ik]['fixed_time']:
				fixed_time = release_dic[v]
				fixed_ver = v
		if fixed_ver not in versioned_issues.keys():
			versioned_issues[fixed_ver] = {}
		versioned_issues[fixed_ver][ik] = issue_data[ik]

	for arch in architectures:
		for issue in versioned_issues[arch.label].keys():
			if "files" not in versioned_issues[arch.label][issue].keys():
				continue
			for f in versioned_issues[arch.label][issue]["files"]:
				for c in arch.clusters:
					for idx in range(len(c.classes)):
						cf = c.classes[idx].split("$")[0]
						if cf in f or f in cf:
							c.entities[idx].titles.append(versioned_issues[arch.label][issue]["title"])
							c.entities[idx].labels.append(versioned_issues[arch.label][issue]["label"])
							c.entities[idx].descs.append(versioned_issues[arch.label][issue]["body"])
							c.entities[idx].issue_ids.append(issue)

	output_dir = join(cur_dir, "Data", "Context_Architecture", software_name, recovery_name)
	version_name = ''
	file_name = ''
	for v in architectures:
		version_name = version_name + v.label + "_"
		file_name = file_name + v.label + "_"
	file_name += target_sub + "_"
	version_name = version_name[:-1]

	if not os.path.exists(output_dir + "/" + version_name):
		os.makedirs(output_dir + "/" + version_name)
	with open(output_dir + "/" + version_name + "/contextualized_archs.pkl", "wb") as f:
		pickle.dump(architectures, f)

	output_dir = join(cur_dir, "Data", "Pairwise", software_name, recovery_name)

	if not os.path.exists(output_dir):
		os.makedirs(output_dir)
	
	# pairwise comparison
	for old_i in range(len(file_names)):
		for new_i in range(old_i+1, len(file_names)):
			getPairwiseComparison(software_name, join(cur_dir, "Data", "Architecture", software_name, recovery_name), file_names[old_i], file_names[new_i], output_dir)

if __name__ == "__main__":
	# ContextMapper('guava', ['guava_v18.0_relax_clusters.rsf', 'guava_20.0_relax_clusters.rsf', 'guava_22.0_relax_clusters.rsf'], 'relax')
	ContextMapper('guava', ['guava-v18.0_acdc_clustered.rsf', 'guava-20.0_acdc_clustered.rsf', 'guava-22.0_acdc_clustered.rsf'], 'acdc')
	# ContextMapper('android', ['android-6.0.0_r1_acdc_clustered.rsf', 'android-7.0.0_r1_acdc_clustered.rsf'], 'acdc')

