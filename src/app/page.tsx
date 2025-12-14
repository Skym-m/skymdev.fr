import '@/app/styles/style.css'
import {client} from '@/sanity/lib/client'
import ProjectList from '@/app/components/ProjectList'
import WelcomeSection from "@/app/components/WelcomeSection";

async function getProjects() {
    const query = `*[_type == "project"] | order(date desc) {
    _id,
    title,
    url,
    image,
    date,
    description,
    "fileUrl": file.asset->url,
    "fileName": file.asset->originalFilename
  }`

    const data = await client.fetch(query)
    return data
}

export default async function Home() {
    const projects = await getProjects()

    return (
        <>
            <WelcomeSection/>

            <section id="about">
                <div className="about">
                    <img src='/skym.png' alt="SkymDev"/>
                    <h1>A propos de moi</h1>
                    <h4>Bonjour ! Moi c'est Skym. Je m'appelle Yannis, je suis développeur.
                        <br/>Depuis tout petit, j'ai toujours aimé l'informatique et par-dessus tout l'espace. J'ai une
                        passion pour tout ce qui vole.<br/>
                        Tout naturellement, j'ai un esprit scientifique et j'aime énormément ce qui touche à la science
                        de manière générale.<br/>
                        <br/>J'ai 18 ans et j'ai mené, depuis quelques années, plusieurs projets.<br/>
                        Qu'ils soient audiovisuels, informatiques, graphiques, ils sont tous répertoriés plus bas.<br/>

                        <br/>Certains sont terminés, d'autres sont en cours de développement ou actifs.<br/>
                        Ils sont parfois réalisés pour des clients, et parfois pour moi-même. Chacun exploite des
                        compétences différentes,
                        que j'ai acquises au fil des années de manière entièrement autodidacte.<br/>
                    </h4>
                </div>
            </section>

            <ProjectList projects={projects}/>

            <section id="dev">
                <div className="dev">
                    <h1>Freelance</h1>
                    <h4>Je travaille avec WebStorm, GitHub, NextJS, React et des headless
                        CMS (Content Management System) pour concevoir les sites internet,
                        qu'ils soient de simples sites vitrines ou des boutiques en ligne.
                        J'écris le code à la main et par conséquent n'utilise aucun éditeur
                        tel que WordPress, Divi, Webflow... Ainsi, mes clients ont un accès total,
                        du code source à la gestion du contenu.
                        J'utilise Adobe Photoshop pour les logos et visuels, et
                        Filmora pour les travaux audiovisuels.
                    </h4>
                </div>
            </section>
        </>
    )
}
