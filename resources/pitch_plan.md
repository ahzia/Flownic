When I registered for this hackthon, I drafted more 10 diffrent idea that could be build using one or more of the chrome builtin ai apis, becouse these APIs are very useful, then I thaught why not build a tool which will give noral non-code user access to these APIs, so they can use anyway they wish

somthing like n8n or google p but offline and with chrome builtin ai

so we build Flownic - a chrome extension that will allow user to create ai workflows using google chrome APIs and run it

here is how it works.

First screen capture video:
lets say I want to build a summerizer workflow that will summerize any content from any language to me in german in any website

create a workflow that will be trigered by cmd+shift+s and will get the content of the page from diffrent languages, and genrate a summery of it in German for me.
it should show the result in a modal

so I click on create new workflow, and describe it
after I click on genrate with ai, it will build the workflow for me, here is what this spesific workflow does:
it gets trigered manualy by shortcut then it gets extracted text page using the context provider, uses the summerizer API to summerize it, then it moves to  trasnlate API... and at the last part of the workflow it shows the modal

lets save this workflow and try it

I can run the workflow we just created using the shortcuts like this, and here is the result

I can also see list of all my workflows and run them.

now that you know how our extension works, lets create a few more adavnced workflow to see the power of flownic

this time lets create a workflow that will write a cover letter for spesific job based on my information

first I need to store my information in the knowledgebase, so I create a workflow that can help me to save my information from linkedin profile to knowledgebase so I can use with diffrent workflows

I can do this manually from here, or I can just create a workflow that will always update my cv based on information in  the page.

lets try the workflow.
here I create a workflow that saves my info, I run the workflow, and my information is now in knowledge base, now lets create workflow to writing a cover letter

this is the promopt I use to create the workfloe, the workflow is created, lets updateed some of the info in  it...

now as you can se I wrote an emil with my cover letter for a spesific job. it uses keywords and ...

workflows are exporable they are just json files, so it can easly be shared and used by diffrent user.
we have plan to create an online markitplace of workflows where user can download it.


lets quickly see some of the workflows I have created using our extension.

show more workflows untill the video time is ennded.




