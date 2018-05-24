import json
from github import Github
import dateutil.parser
from datetime import datetime
import requests
import pickle
from gensim import models
from gensim.corpora import Dictionary
import os
from gensim.parsing.preprocessing import STOPWORDS
from gensim.utils import simple_preprocess

cur_dir = "/".join(os.getcwd().split("/")[:-1])

commit_dict = {}

merged_commit = []
merged_at = []
num_category = 6
with open("models/lr_cv.pkl", "rb") as f:
	lr_cv = pickle.load(f)

doc2vec_model_20 = models.Doc2Vec.load('models/s15_w5_a0025.doc2vec')
dictionary = Dictionary.load('models/dictionary_tokenizer.txtdic')
num_lda_topic = 20

def tokenize(text):
	stopwords = list(STOPWORDS)
	return [token for token in simple_preprocess(text) if token not in stopwords]

def IssueProcessor(user_id, user_pw, organization_name, software_name):
	g = Github(user_id, user_pw, per_page=100)

	org = g.get_organization(organization_name)
	repo = org.get_repo(software_name)

	pulls = repo.get_pulls(state="closed")
	count_i = 0
	for p in pulls:
		count_i += 1
		if p.is_merged():
			print p.merge_commit_sha
			merged_commit.append(p.merge_commit_sha)
			merged_at.append(p.merged_at)
			if len(merged_commit) > len(merged_at):
				print str(len(merged_commit)) + ", " + str(len(merged_at))
				del merged_commit[-1]
			if len(merged_commit) < len(merged_at):
				print str(len(merged_commit)) + ", " + str(len(merged_at))
				del merged_at[-1]

	if not os.path.exists(cur_dir+"/Data/Issues/"+software_name):
	    os.makedirs(cur_dir+"/Data/Issues/"+software_name)

	with open(cur_dir + "/Data/Issues/" + software_name + "/merged_commit.pkl", 'wb') as f:
	    pickle.dump(merged_commit, f)

	with open(cur_dir + "/Data/Issues/" + software_name + "/merged_at.pkl", 'wb') as f:
	    pickle.dump(merged_at, f)

	merged_issues = []
	issues_merged_at = []
	file_dic = {}
	issue_file_data = {}
	issues = repo.get_issues(state="closed")
	count_i = 0
	# for i in issues:
	# 	print count_i
	# 	count_i += 1
	# 	events = i.get_events()
	# 	for e in events:
	# 		if e.commit_id:
	# 			if e.commit_id in merged_commit:
	# 				merged_issues.append(i)
	# 				# print e.commit_id
	# 				issues_merged_at.append(merged_at[merged_commit.index(e.commit_id)])
	# 				print merged_at[merged_commit.index(e.commit_id)]
	# 				files = repo.get_commit(e.commit_id).files
	# 				for f in files:
	# 					if f.filename not in file_dic.keys():
	# 						file_dic[f.filename] = set()
	# 					file_dic[f.filename].add(i.number)
	# 					if i.number not in issue_file_data.keys():
	# 						issue_file_data[i.number] = []
	# 					issue_file_data[i.number].append(f)

	for i in issues:
		for l in i.labels:
			if "status=fixed" == l.name:
				print i.labels
				merged_issues.append(i)
				issues_merged_at.append(i.closed_at)
				events = i.get_events()
				for e in events:
					if e.commit_id:
						if not repo.url in e.raw_data['commit_url']:
							continue
						try:
							files = repo.get_commit(e.commit_id).files
							for f in files:
								if f.filename not in file_dic.keys():
									file_dic[f.filename] = set()
								file_dic[f.filename].add(i.number)
								if i.number not in issue_file_data.keys():
									issue_file_data[i.number] = []
								issue_file_data[i.number].append(f.filename)
						except Exception as err:
							print "Got %s: %s" % (err.__class__.__name__, err)
							continue
						else:
							break	

	with open(cur_dir + "/Data/Issues/" + software_name + "/issue_file.json", "w") as output:
		json.dump(issue_file_data, output)

	with open(cur_dir + "/Data/Issues/" + software_name + "/merged_issues.pkl", 'wb') as f:
	    pickle.dump(merged_issues, f)

	with open(cur_dir + "/Data/Issues/" + software_name + "/issues_merged_at.pkl", 'wb') as f:
	    pickle.dump(issues_merged_at, f)


	with open(cur_dir + "/Data/Issues/" + software_name + "/merged_issues.pkl", "rb") as f:
		merged_issues = pickle.load(f)

	with open(cur_dir + "/Data/Issues/" + software_name + "/issues_merged_at.pkl", "rb") as f:
		issues_merged_at = pickle.load(f)

	releases = repo.get_releases()

	release_dic = {}
	for r in releases:
		release_dic[r.title] = dateutil.parser.parse(r.raw_data['published_at']).replace(tzinfo=None).isoformat()

	# guava
	# release_dic[u'v23.6'] 	  = datetime(2017, 12, 21)
	# release_dic[u'v23.5'] 	  = datetime(2017, 11, 23)
	# release_dic[u'v23.4'] 	  = datetime(2017, 11, 10)
	# release_dic[u'v23.3'] 	  = datetime(2017, 10, 27)
	# release_dic[u'v23.2'] 	  = datetime(2017, 10, 12)
	# release_dic[u'v23.1'] 	  = datetime(2017, 9, 28)
	# release_dic[u'v23.0'] 	  = datetime(2017, 8, 8)
	# release_dic[u'v22.0'] 	  = datetime(2017, 5, 24)
	# release_dic[u'v21.0'] 	  = datetime(2017, 1, 13)
	# release_dic[u'v20.0'] 	  = datetime(2016, 10, 29)
	# release_dic[u'v19.0'] 	  = datetime(2015, 12, 10)
	# release_dic[u'v18.0'] 	  = datetime(2014, 8, 25)

	type_dict = {}
	type_dict["type: enhancement"] 		= 0
	type_dict["type: defect"] 			= 1
	type_dict["type: documentation"] 	= 2
	type_dict["type: api docs"]			= 2
	type_dict["type: performance"]		= 3
	type_dict["type: tests"] 			= 4
	type_dict["type: addition"] 		= 5

	issue_dict = {}
	issue_dict['releases'] = release_dic

	for i_idx in range(len(merged_issues)):
		i = merged_issues[i_idx]
		if i.number not in issue_file_data.keys():
			continue
		issue_dict[str(i.number)] = {}
		issue_dict[str(i.number)]['title'] = i.title
		issue_dict[str(i.number)]['body'] = i.body
		issue_dict[str(i.number)]['label'] = []
		issue_dict[str(i.number)]['fixed_time'] = issues_merged_at[i_idx].isoformat()
		issue_dict[str(i.number)]['files'] = issue_file_data[i.number]
		for l in i.labels:
			if l.name not in type_dict.keys():
				continue
			issue_dict[str(i.number)]['label'].append(type_dict[l.name])
		if len(issue_dict[str(i.number)]['label']) == 0:
			if not i.title:
				continue
			if not i.body:
				continue
			text_vector = doc2vec_model_20.infer_vector(tokenize((i.title + "\n" + i.body).lower())).tolist()
			if "optimization" in i.body or "slow" in i.body or "faster" in i.body:
				text_vector.append(1)
			else:
				text_vector.append(0)
			if "bug" in i.body:
				text_vector.append(1)
			else:
				text_vector.append(0)
			if "wiki" in i.body or "documentation" in i.body or "docs" in i.body or "typo" in i.body:
				text_vector.append(1)
			else:
				text_vector.append(0)
			if "support" in i.body:
				text_vector.append(1)
			else:
				text_vector.append(0)
				issue_dict[str(i.number)]['label'].append(lr_cv.predict(text_vector)[0]+num_category)
		
	with open(cur_dir + "/Data/Issues/" + software_name + "/labeled_issues.json", "w") as output:
		json.dump(issue_dict, output)

if __name__ == "__main__":
	IssueProcessor('namdy0429', 'skaek93', 'eclipse', 'leshan')

