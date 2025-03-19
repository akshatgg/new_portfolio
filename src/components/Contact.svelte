<script>
    import { initializeApp } from 'firebase/app';
    import { getDatabase, ref, set } from 'firebase/database';
    import { firebaseConfig } from '../firebase/firebase';
    import { onMount } from 'svelte';

    const app = initializeApp(firebaseConfig);
    const database = getDatabase(app);

    onMount(() => {
        console.log('Firebase database initialized:', database);
    });

    let data = {
        firstname: '',
        lastname: '',
        email: '',
        description: '',
        phone: ''
    };

    let emailValid = true;
    let phoneValid = true;

    function writeUserData(userData) {
        set(ref(database, `users/${userData.firstname}`), userData)
            .then(() => console.log('Data saved successfully!'))
            .catch((error) => console.error('Error saving data:', error));
    }

    const handleSubmit = (e) => {
        e.preventDefault();

        const validNumber = /^[6-9][0-9]{9}$/;
        const validEmail = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;

        emailValid = validEmail.test(data.email);
        phoneValid = validNumber.test(data.phone);

        if (emailValid && phoneValid) {
            writeUserData(data);

            // Reset form while maintaining reactivity
            data = {
                firstname: '',
                lastname: '',
                email: '',
                description: '',
                phone: ''
            };
        }
    };

    const handleInput = (e) => {
        data = { ...data, [e.target.id]: e.target.value };
    };
</script>

<section class="h-max mt-[64px] md:mt-[80px] flex flex-col w-full items-center px-4 md:px-12 lg:container">
    <div class="bg-gradient-to-r from-secondary-left to-indigo-700 text-transparent bg-clip-text text-4xl md:text-5xl uppercase">
        <span>&lt;&nbsp;&nbsp;Contact Me&nbsp;&nbsp;/&gt;</span>
    </div>
    
    <div class="flex flex-col md:flex-row justify-center items-center gap-20 w-full py-5 md:py-20">
        <form class="flex flex-col w-full justify-evenly items-center gap-5" on:submit={handleSubmit}>
            <div class="w-full lg:w-9/12 text-lg text-primary-button flex flex-col md:flex-row gap-5">
                <div class="md:w-1/2">
                    <label class="px-2" for="firstname">Firstname</label>
                    <input required type="text" id="firstname" class="input" on:input={handleInput} bind:value={data.firstname} />
                </div>
                <div class="md:w-1/2">
                    <label class="px-2" for="lastname">Lastname</label>
                    <input required type="text" id="lastname" class="input" on:input={handleInput} bind:value={data.lastname} />
                </div>
            </div>

            <div class="w-full lg:w-9/12 text-lg text-primary-button flex flex-col">
                <label class="px-2" for="email">Email</label>
                <input required type="email" id="email" class="input" on:input={handleInput} bind:value={data.email} />
                {#if !emailValid}
                    <span class="text-red-700 px-2">Enter a valid email!</span>
                {/if}
            </div>

            <div class="w-full lg:w-9/12 text-lg text-primary-button flex flex-col">
                <label class="px-2" for="phone">Phone No.</label>
                <input required type="tel" id="phone" class="input" on:input={handleInput} bind:value={data.phone} />
                {#if !phoneValid}
                    <span class="text-red-700 px-2">Enter a valid phone number!</span>
                {/if}
            </div>

            <div class="w-full lg:w-9/12 text-lg text-primary-button flex flex-col">
                <label class="px-2" for="description">Description</label>
                <textarea required rows="3" id="description" class="input" on:input={handleInput} bind:value={data.description}></textarea>
            </div>

            <button type="submit" class="submit-button">Connect</button>
        </form>
    </div>
</section>

<style>
    .input {
        padding: 0.375rem 1rem;
        border-radius: 0.5rem;
        color: white;
        background-color: rgb(30, 41, 59);
        width: 100%;
        outline: none;
    }

    .submit-button {
        width: 33%;
        border: 1px solid var(--border-color);
        border-radius: 0.5rem;
        padding: 0.5rem 1rem;
        font-size: 1.25rem;
        color: rgb(34, 197, 94);
        transition: transform 0.2s, box-shadow 0.2s;
    }

    .submit-button:hover {
        box-shadow: 0px 4px 10px rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
    }
</style>
