import json, operator, sys

def getVersionName(filename, software_name):
		if 'relax' in filename:
			return filename.split('_relax')[0].split(software_name+'_')[1]
		elif 'acdc' in filename:
			return filename.split('_acdc')[0].split(software_name+'-')[1]
		elif 'arc' in filename:
			return "_".join(filename.split('_topics')[0].split(software_name+'-')[1].split("_")[:-1])
		else:
			return filename.split('_unknown')[0].split(software_name+'-')[1]

def find_nth(haystack, needle, n):
	start = haystack.find(needle)
	while start >= 0 and n > 1:
		start = haystack.find(needle, start+len(needle))
		n -= 1
	return start

def getPackageName(package, level):
	start_idx = find_nth(package, ".", level-1)
	end_idx = find_nth(package, ".", level)
	# print end_idx
	# print len(package)
	if end_idx == -1:
		# package_name = package[start_idx+1:len(package)]
		package_name = 'leaf'
	else:
		package_name = package[start_idx+1:end_idx]
	# print package_name

	return package_name

def addClusters(data, lines, version_1, version_2, level, changed_comp):
	
	for i in range(len(lines)):
		parsed_l = lines[i].split(" ")

		package_name = getPackageName(parsed_l[2], level)

		if package_name not in data['package_list']:
			data['package_list'].append(package_name)


		if parsed_l[1] not in data['cluster_list']:
			data['children'].append({
				'name': parsed_l[1],
				'package_list': [],
				'children': []
				})
			# print parsed_l[1]
			data['cluster_list'].append(parsed_l[1])

		cluster_idx = data['cluster_list'].index(parsed_l[1])

		if version_1:
			if parsed_l[2] in changed_comp:
				data['children'][cluster_idx]['children'].append({
					'name': parsed_l[2],
					'moved': parsed_l[2],
					# 'diff': "m",
					'version_1': version_1,
					'version': 1,
					'size': 1
					})
			else:				
				data['children'][cluster_idx]['children'].append({
					'name': parsed_l[2],
					'version_1': version_1,
					'version': 1,
					# 'diff': "",
					'size': 1
					})
			data['children'][cluster_idx]['package_list'].append(parsed_l[2])

		else:
			if parsed_l[2] in data['children'][cluster_idx]['package_list']:
				package_idx = data['children'][cluster_idx]['package_list'].index(parsed_l[2])
				data['children'][cluster_idx]['children'][package_idx]['version_2'] = version_2
			else:
				if parsed_l[2] in changed_comp:
					data['children'][cluster_idx]['children'].append({
						'name': parsed_l[2],
						'version_2': version_2,
						'version': 2,
						# 'diff': "+",
						'size': 1
						})
				else:
					data['children'][cluster_idx]['children'].append({
						'name': parsed_l[2],
						'version_2': version_2,
						'version': 2,
						# 'diff': "",
						'size': 1
						})


	return data

def addDiff(data, changed_comp):
	for i in range(len(data['children'])):
		for j in range(len(data['children'][i]['children'])):
			cur_obj = data['children'][i]['children'][j]
			# print cur_obj
			if cur_obj['name'] in changed_comp:
				if 'version_1' in cur_obj:
					cur_obj['diff'] = '-'
				elif 'version_2' in cur_obj:
					cur_obj['diff'] = '+'
			else:
				if 'version_1' in cur_obj and 'version_2' not in cur_obj:
					cur_obj['diff'] = 'r'
				elif 'version_1' not in cur_obj and 'version_2' in cur_obj:
					cur_obj['diff'] = 'a'
				else:
					cur_obj['diff'] = ''
	return data


def getPairwiseComparison(software_name, input_dir, file1, file2, out_dir, hierarchy_level=4):
	# hierarchy_level = 5

	# lines_1 = [line.rstrip('\n') for line in open('chukwa-0.2.0_relax_clusters.rsf')]
	# lines_2 = [line.rstrip('\n') for line in open('chukwa-0.5.0_relax_clusters.rsf')]
	lines_1 = [line.rstrip('\n') for line in open(input_dir + "/" + file1)]
	lines_2 = [line.rstrip('\n') for line in open(input_dir + "/" + file2)]

	data = {}
	data['name'] = 'combined'
	data['children'] = []
	data['cluster_list'] = []
	data['package_list'] = []
	data['package_level'] = hierarchy_level

	changed_comp = []

	for i in range(len(lines_1)):
		for j in range(len(lines_2)):
			split_1 = lines_1[i].split(" ")
			split_2 = lines_2[j].split(" ")
			if split_1[1] != split_2[1] and split_1[2] == split_2[2]:
				# print lines_1[i]
				# print lines_2[j]
				changed_comp.append(split_1[2])

	# line draw			

	data = addClusters(data, lines_1, True, False, hierarchy_level, changed_comp)
	data = addClusters(data, lines_2, False, True, hierarchy_level, changed_comp)

	data = addDiff(data, changed_comp)
	print data['package_list']


	with open(out_dir + "/pairwise_" + getVersionName(file1, software_name) + "_" + getVersionName(file2, software_name) + ".json" , 'w') as output:
		json.dump(data, output)

