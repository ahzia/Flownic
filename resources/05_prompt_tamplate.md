I checked the workflow page and it look nice, lets improve it to follow our main concept.
lets focus on prompt and prompt tamplate at first:
Prompt(the current concept of prompt is actual prompts, but what I mean by this is anything that will be sent to AI (for prompt API that will be a prompt, but for translation API, its just a text, source and target languages) so rename the concept of it maybe to a task or a better name(if you can comeup with somwthing will give better Ux), also we have to create a good archtecture for task/prompt and update the workflow UI based on that:

1. I liked the prompt tamplates, but there should be an option for user to write down his own prompt as well, so add one option at the end of the tamplate for custom prompt, and then give user option to write his own prompt text.
the new prompts will always be run using the prompt API, as this is a custom prompt.

2. prompts input/output: 
this is the data that we pass to prompt, and it depends on which tamplate user has chosen
- for example for tamplates related to trasnlation API, profreeding, summerizering API ...) the input and output should be text, so If we are using a prompt tamplate that relates to one of these APIs, the input and output should be text, we have to tell user that these can be only text(not for example html ...) and dons't allow user to select wrong data type  for these type of prompt tamplates.
- for the prompt API, since the prompt will go to AI it can actually take any type of input and output so it dons't have to be fixed depending on the workflow it can be text, htmls,css, jsvascript, json ...

to better resolve this I have a suggestion in the bellow:

3. data points / variables concepts: each workflow can have data points, or variables (you can comeup with a better name for this as well based on our context to give better UX if possible).
data points can be:
a. tasks/prompt output, each tasks output will automatcally be saved as datapoint to be used in the other parts of the workflow(in other task/prompts)
b. context:
context are also datapoints, we have talked about the context before as well during idiation stage in @resources/ 
the context can be for example the whole web page(including html tags and ...), the selcted text from page, extracted texts from page(no tags, just texts, this is good when for example we are summerizing contents)
in the next phases of project we can also implment:
we should also give user the option to write down a spesfic selctor for the a spesifc tag, where then we will search and consider that spesific tag and its childrens from the page as context, and offcourse we will have context selction from KB, but that we will work on later these are my suggestions you can add more options here as well, but make sure to write the code for them, and write the codes in very clean way
the point is there should be a way for user to add a context as a datapoint in the workflow. so then it can use it in other parts.

4. prompts tamplate input: when user selects a spesific prompt, he can add input to it, from the datapoint(or type it directly)
but the structure of this depends on which tamplate he has selcted, for example for trasnlation API tamplate, deopedning on API docs, it can be somthing like:
{
 text: "user can type here or use a datapoint",
 sourceLanguage: "user can type here or use datapoint",
 targetLanguage: "user can type here or use datapoint".
}
we can also have user interface instead of direct json so user can easly type or selct the values.

user can write text to this or select one of the datapoints 
for all builten prompt tamplates we have to have the input format set already, since its fixed, and user can just add data to it
for the prompt that use prompt API, user can write this as he wish

similar way, for all prompt tamplates we have to also extract the output already, for example not having the whole json response, but just the trasnlated text.

5. once a user creates a task/prompt using prompt tamplates, it will be saved in a json like format, the structure of this json should be same always, so it can be later easly executed.

6. when it comes to executation, user will first trigger the execution, then all needed context will be gathered, and and proceessed using the json and prompt tamplate files one by one, and at the end of the workflow the handeler will be called.

5. Clean Code:
to have more cleaner code for prompt tamplates, we can create one file per prompt tamplate and all prompt tamplate files will have same structure, and functions
for example there will be a function that will call the API with input
another function for processing the output
anpother function for giving us the format of accepted input...

but all prompt tamplates files should have similar structure, follow best practices of coding like what is the best way to acheve this, my suggestion is we can have a genral class for ptompt tamplate with functions, and all prompt tamplates can extend from it, we can actually do the same for handlers as well. see what is best architecture and implment it.

6. each handeler accept a spsific type of data(similar to prompt tamplates) so they will have a similar IO/implmentation when it comes to taking input, for example, a model handerler, can take titile: text, body: text ... and similar to prompt tamplate, user can type these or pass data points to it(results of previous steps in workflow, or somthing from context ...)
Here is an example of user flow(this is just one of the suggestions)

the first prompt tamplate I want to test is the trasnlation tample, here is for example how I want it work(from user prespective, an example of user worflow).
I click on create workflow, and give it a name, then I select the triger as for example "on text selction"
then I add a task, and select language detection tamplate, and in input/context/data I select "selected text on the page" from list of data points
then I add another task, and selct the trasnlation tamplate, then in the input I use the output of the previous task from list of data points as source language, and I select target language as "English" for example, and I selct the "selcted text" from list of datapoints as input text.
then I add a handeler, and select modal for example, and then I write a titile for modal, and in the body I selct the output of the trasnlation task from list of datapoints.

at the end I also add a list of websites that I want this workflow to work on, for edxample medium.com

and save it.

then I can see the workflow in the workflow list, and I can activate it.


later when I am on those specific websites, and if I selct a text, the workflow will be trigered and I can see the trasnlation in the modal.


the main point is to be able to handel a complex project like this we have to create main classes for tamplates, handelers, datapoints... this way we are sure that diffrent tamplates and ... can work with eachother.