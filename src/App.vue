<template>
  <div id="app">
    <v-app>
      <v-navigation-drawer v-model="showNav" app>
        <MainMenu :currentView="currentView()" @click.stop="toggleBar()"></MainMenu>
      </v-navigation-drawer>
      <v-toolbar app dark flat color="primary">
        <v-app-bar-nav-icon @click.stop="toggleBar()"></v-app-bar-nav-icon>
        <v-toolbar-title>{{ currentTitle() }}</v-toolbar-title>
      </v-toolbar>
      <v-content>
        <v-container
          @click.stop="showNav = false"
          fluid
          fill-height
          class="content-panel"
        >
          <div class="demo">
            <div class="ui-container">
              <router-view :hasWebGL="hasWebGL"></router-view>
              <v-layout column align-center fill-height class="footer-label">
                {{ currentDescription() }}
              </v-layout>
              <a
                column
                align-center
                fill-height
                class="model-link"
                :href="currentLink()"
                >{{ currentLink() }}</a
              >
            </div>
          </div>
        </v-container>
      </v-content>
    </v-app>
  </div>
</template>

<script lang="ts">
import MainMenu from "./components/MainMenu.vue";

import {
  DEMO_TITLES,
  DEMO_DESCRIPTIONS,
  DEMO_MODEL_LINKS,
} from "./data/demo-titles";

import { defineComponent, ref } from "vue";
import { useRouter } from "vue-router";

export default defineComponent({
  components: { MainMenu },
  setup() {
    const showNav = ref(false);
    const hasWebGL: boolean = true;

    const $route = useRouter();

    function currentView() {
      const path = $route.currentRoute.value.path;
      return path.replace(/^\//, "") || "home";
    }

    function toggleBar() {
      showNav.value = !showNav.value;
    }

    function currentTitle() {
      const title = DEMO_TITLES[currentView()];
      if (title) {
        return title;
      } else {
        return "ONNX Runtime Web";
      }
    }

    function currentDescription() {
      const description = DEMO_DESCRIPTIONS[currentView()];
      if (description) {
        return description;
      } else {
        return "";
      }
    }

    function currentLink() {
      const link = DEMO_MODEL_LINKS[currentView()];
      if (link) {
        return link;
      } else {
        return "";
      }
    }

    return {
      showNav,
      hasWebGL,
      currentView,
      currentTitle,
      currentDescription,
      currentLink,
      toggleBar,
    };
  },
});
</script>

<style lang="postcss">
@import "./variables.css";

.application {
  font-family: var(--font-sans-serif) !important;
  font-size: 18px;
}

.application.theme--light {
  background: linear-gradient(0deg, #070606, #f0f0f0) !important;
  color: var(--color-darkgray);
}

footer {
  background: #3d3a3a !important;
}

.footer-label {
  font-family: Segoe UI Semibold, Open Sans, -apple-system, BlinkMacSystemFont,
    Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
    sans-serif;
  font-size: 16px;
  color: #69707a;
  text-align: center;
  user-select: none;
  cursor: default;
  width: 70%;
  margin-left: 15%;
  justify-content: center;
  align-self: center;
}

.model-link {
  font-family: Segoe UI Semibold, Open Sans, -apple-system, BlinkMacSystemFont,
    Roboto, Oxygen, Ubuntu, Cantarell, Fira Sans, Droid Sans, Helvetica Neue,
    sans-serif;
  font-size: 12px;
  user-select: none;
  cursor: default;
  width: auto;
  justify-content: center;
  display: flex;
}

a {
  text-decoration: none;
}

.demo {
  position: relative;
  width: 100%;
  height: 100%;
}

/*******************************************************************/
/* Vuetify overrides */

.navigation-drawer {
  background-color: whitesmoke !important;
}

.input-group--select .input-group__selections__comma,
.input-group input,
.input-group textarea {
  font-size: 20px !important;
  color: var(--color-black) !important;
}

.input-group:not(.input-group--error) label {
  font-size: 20px !important;
  color: var(--color-lightgray) !important;
}

.list .list__tile:not(.list__tile--active) {
  color: var(--color-darkgray) !important;
}

.list__tile {
  font-size: 16px !important;
  height: 35px !important;
  font-family: var(--font-monospace);
}

.content-panel {
  padding: 0 !important;
}

.select-backend {
  text-align: center;
  font-family: var(--font-sans-serif);
  font-size: 20px;
  color: var(--color-black);
  margin-right: 10px;
}

.error-message {
  color: var(--color-error);
  font-size: 15px;
  text-align: center;
}
</style>
