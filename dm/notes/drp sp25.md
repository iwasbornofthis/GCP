# drp25
repo for Directed Reading Program SP25

#### questions...

- [ ] does adding more participants increase regression $R^2$? (0.45 -> ??)
- [ ] can we do a dimensionality reduction with a vector including macros + spike? are there any clusters --> participants are sufficiently different? 
- [ ] run analysis without fiber

#### obs...
- In order of contribution for libre in regression by coefficients: fiber (-3.13), carbs (1.01), protein (0.41). fats (0.14) and overall calories (-0.087) aren't really correlated. --> makes a lot of sense actually. doesn't say anything about contribution
- About same $R^2$ for dexcom, similar coefficient magnitudes and same signs
- Adding all participants to the same df reduced correlation? --> seems like a personalized approach is needed...

### Todo
- [ ] take care of double peaks? (prominences of 10 seem good for selecting the major peaks after meals)
- [ ] use get prominences to get left heights
- [ ] explain why there are so many different meals with 50-60 carbs. 
- [ ] improve predictive accuracy

### presentation outline
1. intro slide 
2. agenda
3. introduction about glucose monitors (personal story)
4. introductory analysis (explaining dataset, visualization of signal, healthy ranges, plotting meals, detecting peaks, explaining peaks [double peak phenomenon] )
5. first task (can we use meal macros to predict height of glucose spike)
6. user app idea 
7. different architectures of 
8. thanks to drp program (special thanks to drew and josiah)



mentor: [Andrew "Drew" Henrichson](https://www.linkedin.com/in/andrew-henrichsen-coding-mathematician/)
[brainstorming doc made by andrew](https://livejohnshopkins-my.sharepoint.com/:w:/r/personal/ahenric7_jh_edu/_layouts/15/Doc.aspx?sourcedoc=%7B3CC2FE5E-1B50-486F-A53C-8294310131A2%7D&file=Definitions%2C%20Brainstorming%2C%20and%20Questions%20with%20Viggy.docx&action=default&mobileredirect=true)

---
## 3/5/25

action items: 3/5 --> 3/12
- [ ] healthy ranges note: how long you're spending there
- [ ] predict y/n spike after a meal (use threshold) given patient's initial bio.csv metadata and meal macros
- [ ] predict macros based on food images
	- [ ] i.e. use trained model for food detection, transfer learning to cgm macros food images, attempt to predict macros (try cals first then others)

Notes: 
* unfortunately, no time based insulin measurements --> unknown whether the participants are taking insulin to bring down the spikes or not
* we think yes, due to how fast the spike is coming down
* == mention in [[drp25 presentation]] that 

Off the Shelf Models

* Food Datasets
	* Food 101
	* VireoFood 172

* has been done before
	* [paper for calorie estimating](https://github.com/ChetanJarande31/Food-calorie-estimations-Using-Deep-Learning-And-Computer-Vision)
	* [cal.ai](https://www.calai.app/)
	* https://ieeexplore.ieee.org/stamp/stamp.jsp?tp=&arnumber=10083648
	* 
* Food classification models are common, but very few open models out there that estimate calories
	* EfficientNet, ResNet
	* [Yolov5]( https://github.com/mrvackgl/food-detection-yolov5), [yolov4]( https://arxiv.org/abs/f Yolov4)
	* suggested pipeline: 
		* food classificaion --> segmentation --> Depth estimation --> api?

* Calorie estimation api
	* https://dev.caloriemama.ai/ --> costs a lot of money
	* nutritionix api --> free 
	* chatGPT --> use their api to estimate calories? 
		* other vision transformers
* https://medium.com/@cyberbuddy.p/intelligent-food-calorie-calculator-b4a03c1510da
* https://andrewkushnerov.medium.com/ai-powered-calorie-tracker-how-to-use-chatgpt-and-python-to-analyze-your-meals-e6880a0db4ac*
---

## 2/24/25

meeting 2/26 --> due for next meeting 3/5
- [ ] healthy ranges note: how long you're spending there
- [ ] plotting insuling with meal time with glucose spike
- [ ] estimating high glycemic index
- [x] look for off the shelf models for food calorie estimation
- [ ] look for data labeling ideas
- [x] check if insulin is taken at the same time
	- [x] check for amount of insulin

---

## 2/17/25

meeting 2/17/25 --> due for next meeting 2/24/25
- [x] look through CGM dataset, catalog available data
- [x] look at the available pictures of food
- [x] visualize CGM time series
- [ ] find an OTS model that perhaps identifies food for you

goal: 
present at MATRX conference,
submission deadline march 9th
arXiv paper?


---

## 2/12/25

some more ideas:
* fuzzy logic
* logic tensor networks 

more data
* physionet seems to have a lot of interesting datasets, many of which are recent and seem to be novel (i.e. the only of their kind)
* ==(!) physionet [CGMacros: a scientific dataset for personalized nutrition and diet monitoring](https://physionet.org/content/cgmacros/1.0.0/) ==(1/28/25)--> multimodal information from two CGMs, food macros, food photographs,  physical activity --> app potential? predict glucose spike before consumer app? (first dataset of it's kind...)
	* also have signal processing experience
* (!!) physionet [TAME Pain: Trustworth AssessMEnt of Pain from Speech and Audio for the Empowerment of Patients](https://physionet.org/content/tame-pain/1.0.0/) (1/21/25)
	* audio analysis project, audio used to estimate pain levels in participant (need: precise estimation of pain regardless of language/ability to communicate)
* (!!!) physionet [MS-CXR: Making the Most of Text Semantics to Improve Biomedical Vision-Language Processing](https://physionet.org/content/ms-cxr/1.1.0/) (11/15/24)
	* project in "phrase grounding": labeling of image regions with phrases (rather than just identification)
	* data is NIH chest. x-ray data with bounding box annotations 
* (?) physionet [Me-LLaMA: Foundation Large Language Models for Medical Applications](https://physionet.org/content/me-llama/1.0.0/) 
	* i think this is just the model itself?
* UCI ML Repo: [Twitter Geospatial Data](https://archive.ics.uci.edu/dataset/1050/twitter+geospatial+data)
	* full week of tweets (12M) between monday in mid january. 2013
	* not sure what could be done with this*
* *


PAPERS
[Towards Cognitive AI systems: a survey and prospective on neuro-symbolic ai](https://arxiv.org/pdf/2401.01040)
* 5 different paradigms of how symbolic systems join with neural systems
* benchmarked (runtime scalability)
* presented challenges & future opportunities
	* need bigger ImageNet-like datasets
	* better ways to unify neural, symbolic, and probabilstic models
	* hardware approaches
* 

---

### Datasets

###### NLP
* [Sentiment Analysis for Mental Health (Kaggle)](https://www.kaggle.com/datasets/suchintikasarkar/sentiment-analysis-for-mental-health)
* [COVID-19 Open Research Dataset Challenge (CORD-19) (Kaggle)](https://www.kaggle.com/datasets/allen-institute-for-ai/CORD-19-research-challenge)
* [Psychometric NLP (PapersWithCode)](https://paperswithcode.com/dataset/psychometric-nlp)
* [The Pile](https://pile.eleuther.ai/) --> 800 GB Dataset of Diverse Text for Language Modeling
* 

### Notes 
* cognitive ai modeling would be interesting*
	* - Frameworks like ACT-R, Soar, and OpenCog attempt to model human cognition computationally.
	- **Neurosymbolic AI** – Combines symbolic reasoning (logic-based AI) with deep learning to improve interpretability and reasoning.*
	- [The Newell Test for a theory of cognition](https://stanford.edu/~jlmcc/papers/AndersonLebiere03.pdf) --> attempting to model this with mathematics and build a model that works? ]
	- [Logic Tensor Networks (Logic Tensor Networks: Deep Learning and Logical Reasoning from Data and Knowledge" (2016)](https://arxiv.org/abs/2012.13635)
	- chain of thought
- voice based NLP applications?

### Problem
* displaying items that are carried in stores nearby in one place, rather than searching stores manually
* obsidian toc contextualization
* ai summary from notes lectures/combine notes from other students
	* spit out summaries/quiz questions
* managing multiple calendars --> "in a more flexible way"
	* more modularity...
* exports calendar into gantt chart...
	* read through all the meeting notes and complete notes...
* real-time study spot monitoring...
* upload resume and curates jobs that fit the role...
	* key word searches are hard...
	* systems engineer vs imaging engineer... 
[[business ideas]]
