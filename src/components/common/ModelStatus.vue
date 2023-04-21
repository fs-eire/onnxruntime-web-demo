<script lang="ts">
import { defineComponent, ref } from "vue";

export default defineComponent({
  name:'ModelStatus',
  props: {
    modelLoading: { required: true, type: Boolean },
    modelInitializing: { required: true, type: Boolean },
  },

  setup(props) {
    const value = ref(0);
    
    const message = ref(() => {
      if (props.modelLoading) {
        return "Loading model...";
      } else if (props.modelInitializing) {
        return "Loading model done. Initializing model...";
      } else {
        return "";
      }
    });
    
    return { value, message };
  },

  get message() {
    if (this.modelLoading) {
      return "Loading model...";
    } else if (this.modelInitializing) {
      return "Loading model done. Initializing model...";
    } else {
      return "";
    }
  }

})
</script>

<template>
  <v-layout class="model-status-background">
    <v-span>
      <div class="model-status">{{ message() }}</div>
      <v-progress-circular
        v-show="modelLoading || modelInitializing"
        indeterminate
        justify-center
        flex
        style="justify: center; align-self: center;"
        color="primary"
      />
    </v-span>
  </v-layout>
</template>

<style scoped lang="postcss">
@import "../../variables.css";

.model-status-background {
  position: relative;
  width: 100%;
  height: 100%;
  background-color: whitesmoke;
  opacity: 1;
  justify-content: center;
  text-align: center;
}
.model-status {
  padding: 30px;
  margin-top: 100px;
  font-size: 25px;
  color: var(--color-blue);
  position: relative;
  top: 0px;
  opacity: 100;
  z-index: 5;
  display: center;
  margin: 0 auto;
}
</style>
