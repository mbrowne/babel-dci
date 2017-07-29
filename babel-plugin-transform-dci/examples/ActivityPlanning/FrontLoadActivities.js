/* @flow */

//IN PROGRESS

//TEMP
//https://github.com/wangvnn/DCIProkon/blob/master/src/ProkonDCI/Domain/Operation/FrontLoad.cs
//https://gist.github.com/mbrowne/215f2dd2a92841c48b5d

export default function FrontLoadActivities(project: Project) {
	allActivities: [Activity] = project.activities;

	allActivities.forEach(a => a.earlyStart = 0);
	
	allActivities.findUnplannedActivities().forEach(a => frontloadActivity(a));
	
	role project {}
	
	role allActivities {
		findUnplannedActivities(): Array<Activity> {
			return allActivities.filter(a => ...);
		}
	}
	
	//inner Context
	function frontloadActivity(unplannedActivity: Activity) {
		unplannedActivity.frontLoad();
		
		role unplannedActivity() {
			frontLoad() {
				//const maxPred: Activity = predecessors.FirstOrDefault(p => p.EarlyFinish == c.Predecessors.Max(m => m.EarlyFinish));
                if (maxPred != null) {
                    self.earlyStart = maxPred.earlyFinish + 1;
                }
                else {
                    self.earlyStart = project.startTime;
                }
			}
		}
	}
}

/*
context Frontload
{
     ...
     
     role Model {
         private void FrontLoad() {
             //Reset start and end times of all Activities
            AllActivities.ForEach(a => a.EarlyStart = 0);
            
            Activity UnplannedActivity;
            do {
                UnplannedActivity = AllActivities.FindUnplannedActivity();
                FrontloadActivity(UnplannedActivity);
            }
            while (UnplannedActivity != null);
        }
    }
    
    role AllActivities {
        Activity FindUnplannedActivity(List<Activity> AllActivities) {
            return AllActivities.FirstOrDefault(
                a => a.EarlyStart == 0 &&
                !Model.PredecessorsOf(a).Any(p => p.EarlyFinish == 0)
            );
        }
    }
    
    @context
    void FrontloadActivity(UnplannedActivity)
    {    
        UnplannedActivity.FrontLoad();
    
        role UnplannedActivity {
            void FrontLoad() {
                Activity maxPred = Predecessors.FirstOrDefault(p => p.EarlyFinish == c.Predecessors.Max(m => m.EarlyFinish));
                if (maxPred != null) {
                    UnplannedActivity.EarlyStart = maxPred.EarlyFinish + 1;
                }
                else {
                    UnplannedActivity.EarlyStart = c.ProjectStart;
                }
            }
        }
    }
}
*/