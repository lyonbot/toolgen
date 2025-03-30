import { defineStore } from "pinia";
import { Project, useProjectsStore } from "./projects";
import { computed, toRaw } from "vue";

/** 
 * we use this to read and manipulate the project file 
 * 
 * see `useProject` too
 */
export class ProjectView {
  constructor(private project: Project) {
  }

  getFiles() {
    return toRaw(this.project.files);
  }
}

export const useProjectView = defineStore("projectView", () => {
  const store = useProjectsStore();
  const projectView = computed(() => new ProjectView(store.currentProject!))

  return {
    projectView,
  };
})
