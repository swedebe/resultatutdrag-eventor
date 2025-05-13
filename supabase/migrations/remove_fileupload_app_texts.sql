
-- Remove app texts related to file upload functionality
DELETE FROM public.app_texts WHERE category = 'fileupload';

-- Update any relevant texts that might have references to file upload
UPDATE public.app_texts 
SET value = 'Med detta verktyg kan du använda en exportfil från Eventor för att hämta banlängd och antal startande via batch-bearbetning.'
WHERE key = 'tool_description';

-- Make sure welcome message doesn't reference file upload
UPDATE public.app_texts
SET value = 'Välkommen {0} till Resultatanalys för batchbearbetning'
WHERE key = 'welcome_message';
