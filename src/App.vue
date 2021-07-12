<template>
<h1>{{count}}</h1>
<button @click="count++">add</button>
</template>

<script>
import {ref} from 'vue'

export default {
  setup () {
    const count = ref(0)

    return {
      count,
    }
  }
}
</script>
