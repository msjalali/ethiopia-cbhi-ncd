<!-- SCRIPT -->
<script lang="ts">
export let open = false

function close() {
  open = false
}
function onKeydown(e: KeyboardEvent) {
  if (!open) return
  if (e.key === 'Escape') close()
}
</script>

<svelte:window on:keydown={onKeydown} />

<!-- TEMPLATE -->
{#if open}
  <div class="backdrop" on:click={close} on:keydown={() => {}} role="presentation">
    <div
      class="modal"
      role="dialog"
      aria-modal="true"
      aria-label="How to use this dashboard"
      on:click|stopPropagation
      on:keydown={() => {}}
    >
      <div class="modal-header">
        <div class="modal-title">Get the Most Out of This Dashboard</div>
        <button type="button" class="close-button" aria-label="Close" on:click={close}>&times;</button>
      </div>

      <div class="content">
        <p>
          Moving a slider won&rsquo;t always produce a dramatic change, and that&rsquo;s useful information in itself.
          Some levers move outcomes a lot; others barely move them at all. A few ways to build intuition as you
          explore:
        </p>
        <ul>
          <li>
            <strong>Set a target.</strong> Pick a goal, say 60% of hypertension patients in treatment by 2030, and
            adjust the levers until the projection gets there. What combination did it take?
          </li>
          <li>
            <strong>Guess before you move.</strong> Before adjusting a slider, predict how much you think it will
            shift the outcome. Then check the stat box above the plot to see if you were right.
          </li>
          <li>
            <strong>Isolate one lever at a time.</strong> Reset first, then try a single slider on its own before
            combining several, so you can see which levers matter most.
          </li>
          <li>
            <strong>Start from a scenario, then fine-tune.</strong> Use the Example Scenarios as a starting point,
            then adjust individual sliders from there to see how the outcome shifts.
          </li>
        </ul>
        <p>
          If a lever barely moves the projection, that&rsquo;s a real finding: it suggests that lever isn&rsquo;t
          where the bottleneck is.
        </p>
      </div>

      <div class="modal-footer">
        <button type="button" class="nav-button" on:click={close}>Got it</button>
      </div>
    </div>
  </div>
{/if}

<!-- STYLE -->
<style lang="sass">
.backdrop
  position: fixed
  inset: 0
  background-color: rgba(20, 30, 40, 0.55)
  display: flex
  align-items: center
  justify-content: center
  z-index: 1000
  padding: 24px
  box-sizing: border-box

.modal
  display: flex
  flex-direction: column
  gap: 12px
  background-color: #fff
  border-radius: 12px
  padding: 20px
  width: 100%
  max-width: 640px
  max-height: 90vh
  overflow-y: auto
  box-sizing: border-box
  box-shadow: 0 12px 40px rgba(0,0,0,0.25)

  @media (max-width: 800px)
    max-width: none
    width: 100%
    height: 100%
    max-height: none
    border-radius: 0

.modal-header
  display: flex
  flex-direction: row
  justify-content: space-between
  align-items: center
  flex-shrink: 0

.modal-title
  font-size: 1.1em
  font-weight: 700
  color: #1f3a4d

.close-button
  border: none
  background: none
  font-size: 1.6em
  line-height: 1
  color: #5c6b77
  cursor: pointer
  padding: 0 4px

  &:hover
    color: #1f3a4d

.content
  font-size: .95em
  color: #3d4a54
  line-height: 1.55

  p
    margin: 0 0 12px 0

  ul
    margin: 0 0 12px 0
    padding-left: 1.2em
    display: flex
    flex-direction: column
    gap: 8px

  strong
    color: #1f3a4d

.modal-footer
  display: flex
  flex-direction: row
  align-items: center
  justify-content: flex-end
  flex-shrink: 0

.nav-button
  padding: 6px 16px
  font-size: .9em
  font-weight: 600
  color: #1f3a4d
  background-color: #fff
  border: 1px solid #9db2c2
  border-radius: 8px
  cursor: pointer
  transition: background-color .15s ease, border-color .15s ease

  &:hover
    background-color: #dce5ec
    border-color: #5c6b77
</style>
